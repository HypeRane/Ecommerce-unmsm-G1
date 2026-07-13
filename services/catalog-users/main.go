package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

// Servicio: Catálogo / Usuarios
// Responsabilidad: CRUD de productos y perfiles.
// Nota: este esqueleto usa datos en memoria para que el equipo pueda
// desplegar YA y ver el servicio vivo en la nube. Cuando el schema de
// Supabase esté listo, reemplacen los mocks por queries reales
// (usen database/sql + github.com/jackc/pgx/v5/stdlib, o el driver que prefieran).

type Product struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

var mockProducts = []Product{
	{ID: "1", Name: "Polo UNMSM", Price: 45.90, Stock: 20},
	{ID: "2", Name: "Mochila Tech", Price: 129.90, Stock: 8},
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	origin := os.Getenv("FRONTEND_ORIGIN")
	if origin == "" {
		origin = "*" // TODO: restringir a la URL real de Vercel antes de la sustentación
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
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
			"service": "catalog-users",
		})
	}))

	mux.HandleFunc("GET /products", withCORS(func(w http.ResponseWriter, r *http.Request) {
		// TODO: reemplazar por SELECT real a Supabase, con filtros/orden/paginación
		// (?category=, ?sort=, ?page=)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockProducts)
	}))

	mux.HandleFunc("GET /products/{id}", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		for _, p := range mockProducts {
			if p.ID == id {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(p)
				return
			}
		}
		http.Error(w, `{"error":"product not found"}`, http.StatusNotFound)
	}))

	mux.HandleFunc("POST /products", withCORS(func(w http.ResponseWriter, r *http.Request) {
		// TODO: validar rol Administrador (JWT de Supabase Auth) antes de insertar
		var p Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		mockProducts = append(mockProducts, p)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(p)
	}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("catalog-users escuchando en :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
