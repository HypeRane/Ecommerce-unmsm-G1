package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Suggestion struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	ImageURL string  `json:"image_url"`
	Reason   string  `json:"reason"`
}

var db *sql.DB
var dbConnected bool = false // Bandera para saber si usamos la DB o los Mocks

// Datos temporales de rescate
var mockSuggestions = []Suggestion{
	{ID: "1", Name: "Polo UNMSM", Price: 45.90, ImageURL: "https://via.placeholder.com/200", Reason: "El más vendido (Mock)"},
	{ID: "2", Name: "Mochila Tech", Price: 129.90, ImageURL: "https://via.placeholder.com/200", Reason: "Recomendado (Mock)"},
}

func initDB() {
	connStr := os.Getenv("SUPABASE_DB_URL")
	if connStr == "" {
		log.Println("⚠️ Advertencia: No hay SUPABASE_DB_URL en el .env. Usando datos Mock.")
		return
	}

	var err error
	db, err = sql.Open("pgx", connStr)
	if err != nil {
		log.Printf("⚠️ Advertencia: Error abriendo conexión a DB. Usando datos Mock. Detalle: %v", err)
		return
	}

	if err = db.Ping(); err != nil {
		log.Printf("⚠️ Advertencia: Contraseña o conexión a Supabase falló. Activando modo Mock temporal. Detalle: %v", err)
		return
	}

	log.Println("✅ Conexión a Supabase establecida correctamente.")
	dbConnected = true
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

func suggestionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Si la base de datos falló, devolvemos los mocks inmediatamente
	if !dbConnected {
		json.NewEncoder(w).Encode(mockSuggestions)
		return
	}

	// LÓGICA CON BASE DE DATOS REAL
	productID := r.URL.Query().Get("product_id")
	var suggestions []Suggestion
	var rows *sql.Rows
	var err error

	if productID != "" {
		rows, err = db.Query("SELECT id, name, price, image_url FROM get_related_products($1, 5)", productID)
		if err != nil {
			log.Printf("Error DB: %v", err)
			json.NewEncoder(w).Encode(mockSuggestions) // Fallback seguro
			return
		}
	} else {
		query := `SELECT id, name, price, image_url FROM products WHERE is_active = true ORDER BY sales DESC LIMIT 5`
		rows, err = db.Query(query)
		if err != nil {
			log.Printf("Error DB: %v", err)
			json.NewEncoder(w).Encode(mockSuggestions) // Fallback seguro
			return
		}
	}
	defer rows.Close()

	for rows.Next() {
		var s Suggestion
		var imgURL sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.Price, &imgURL); err == nil {
			s.ImageURL = imgURL.String
			s.Reason = "Sugerencia del sistema"
			suggestions = append(suggestions, s)
		}
	}

	json.NewEncoder(w).Encode(suggestions)
}

func main() {
	initDB()
	if dbConnected {
		defer db.Close()
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		status := "conectado a base de datos"
		if !dbConnected {
			status = "usando mocks temporales"
		}
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "suggestions",
			"mode":    status,
		})
	}))

	mux.HandleFunc("GET /suggestions", withCORS(suggestionsHandler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	log.Printf("🚀 Servicio de sugerencias escuchando en el puerto :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
