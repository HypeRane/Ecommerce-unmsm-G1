package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

// Servicio: Sugerencias ("El Cerebro")
// Alcance recortado para 2 días: en vez del sistema multi-agente del PPT,
// esto devuelve "productos relacionados por categoría" / "más vendidos".
// Es honesto en la sustentación decir "priorizamos el despliegue funcional
// sobre el algoritmo completo" — es literalmente lo que pidió el profesor.
//
// Cuando tengan tiempo: conecten Redis (github.com/redis/go-redis/v9) para
// cachear esta respuesta y no recalcularla en cada clic.

type Suggestion struct {
	ProductID string `json:"product_id"`
	Reason    string `json:"reason"`
}

var mockSuggestions = []Suggestion{
	{ProductID: "2", Reason: "más vendido en tu categoría"},
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	origin := os.Getenv("FRONTEND_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
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
			"service": "suggestions",
		})
	}))

	mux.HandleFunc("GET /suggestions", withCORS(func(w http.ResponseWriter, r *http.Request) {
		// query params disponibles: r.URL.Query().Get("product_id")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockSuggestions)
	}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	log.Printf("suggestions escuchando en :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
