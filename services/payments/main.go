package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/paymentintent"
	"github.com/stripe/stripe-go/v85/webhook"
)

// Servicio: Pagos
// - POST /create-payment-intent  -> crea el Payment Intent real en Stripe
// - POST /webhook                -> recibe la confirmación de Stripe, VERIFICA LA FIRMA,
//                                    y si el pago fue exitoso, actualiza la orden en Supabase.

type PaymentRequest struct {
	OrderID string `json:"order_id"`
	Amount  int64  `json:"amount"` // en céntimos, ej: S/ 45.90 -> 4590
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	origin := os.Getenv("FRONTEND_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h(w, r)
	}
}

// updateOrderStatus llama al REST API de Supabase (PostgREST) para actualizar
// el estado de la orden. No necesita ningún driver de base de datos.
func updateOrderStatus(orderID, status string) error {
	supabaseURL := os.Getenv("SUPABASE_URL")               // ej: https://xxxx.supabase.co
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")   // Settings -> API -> service_role (secreta, NUNCA al frontend)
	if supabaseURL == "" || serviceKey == "" {
		log.Println("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados, se omite el update")
		return nil
	}

	url := fmt.Sprintf("%s/rest/v1/orders?id=eq.%s", supabaseURL, orderID)
	body, _ := json.Marshal(map[string]string{"status": status})

	req, err := http.NewRequest(http.MethodPatch, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase respondió %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

func main() {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "payments"})
	}))

	mux.HandleFunc("POST /create-payment-intent", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req PaymentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		if req.Amount <= 0 {
			http.Error(w, `{"error":"amount must be > 0"}`, http.StatusBadRequest)
			return
		}

		params := &stripe.PaymentIntentParams{
			Amount:   stripe.Int64(req.Amount),
			Currency: stripe.String(string(stripe.CurrencyPEN)),
		}
		params.AddMetadata("order_id", req.OrderID)

		pi, err := paymentintent.New(params)
		if err != nil {
			log.Println("error creando payment intent:", err)
			http.Error(w, `{"error":"stripe error"}`, http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"client_secret": pi.ClientSecret,
			"order_id":      req.OrderID,
		})
	}))

	mux.HandleFunc("POST /webhook", func(w http.ResponseWriter, r *http.Request) {
		// El webhook NO lleva CORS (Stripe llama servidor-a-servidor, no desde el navegador).
		payload, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "error reading body", http.StatusBadRequest)
			return
		}

		sigHeader := r.Header.Get("Stripe-Signature")
		event, err := webhook.ConstructEvent(payload, sigHeader, webhookSecret)
		if err != nil {
			// Firma inválida: alguien intentó simular un webhook. Rechazar siempre.
			log.Println("firma de webhook inválida:", err)
			http.Error(w, "invalid signature", http.StatusBadRequest)
			return
		}

		switch event.Type {
		case "payment_intent.succeeded":
			var pi stripe.PaymentIntent
			if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
				log.Println("error parseando payment intent:", err)
				break
			}
			orderID := pi.Metadata["order_id"]
			if orderID != "" {
				if err := updateOrderStatus(orderID, "pagado"); err != nil {
					log.Println("error actualizando orden en Supabase:", err)
				} else {
					log.Println("orden actualizada a 'pagado':", orderID)
				}
			}
		case "payment_intent.payment_failed":
			var pi stripe.PaymentIntent
			if err := json.Unmarshal(event.Data.Raw, &pi); err == nil {
				if orderID := pi.Metadata["order_id"]; orderID != "" {
					_ = updateOrderStatus(orderID, "fallido")
				}
			}
		default:
			log.Println("evento no manejado:", event.Type)
		}

		w.WriteHeader(http.StatusOK)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("payments escuchando en :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}