package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

// Servicio: Pagos
// Responsabilidad: hablar con Stripe (Payment Intents + Webhook).
// Este esqueleto NO llama a Stripe todavía (para desplegar sin depender de
// una API key desde el día 1). Cuando tengan la cuenta de Stripe:
//   1. go get github.com/stripe/stripe-go/v78
//   2. Reemplacen createPaymentIntent con la llamada real
//   3. En el webhook, verifiquen la firma con webhook.ConstructEvent()
//      usando el STRIPE_WEBHOOK_SECRET (NUNCA se salten este paso)

type PaymentRequest struct {
	OrderID string  `json:"order_id"`
	Amount  float64 `json:"amount"`
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

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "payments",
		})
	}))

	mux.HandleFunc("POST /create-payment-intent", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req PaymentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		// TODO: reemplazar por la llamada real a Stripe (paymentintent.New)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"client_secret": "TODO_stripe_client_secret",
			"order_id":      req.OrderID,
		})
	}))

	mux.HandleFunc("POST /webhook", withCORS(func(w http.ResponseWriter, r *http.Request) {
		// TODO CRÍTICO: verificar la firma del webhook (header Stripe-Signature)
		// antes de confiar en el body. Sin esto, cualquiera puede simular un pago.
		log.Println("webhook recibido (pendiente de verificación de firma)")
		w.WriteHeader(http.StatusOK)
	}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("payments escuchando en :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
