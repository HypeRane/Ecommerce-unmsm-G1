package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/redis/go-redis/v9"
)

// Suggestion representa un producto sugerido al frontend.
type Suggestion struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	ImageURL string  `json:"image_url"`
	Reason   string  `json:"reason"`
}

// TTL del cache Redis
const cacheTTL = 5 * time.Minute

var (
	db          *sql.DB
	rdb         *redis.Client
	dbConnected    bool
	redisConnected bool
)

// Datos de rescate si la DB no está disponible.
var mockSuggestions = []Suggestion{
	{ID: "1", Name: "Polo UNMSM", Price: 45.90, ImageURL: "https://via.placeholder.com/200", Reason: "El más vendido (Mock)"},
	{ID: "2", Name: "Mochila Tech", Price: 129.90, ImageURL: "https://via.placeholder.com/200", Reason: "Recomendado (Mock)"},
}

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

func initDB() {
	connStr := os.Getenv("SUPABASE_DB_URL")
	if connStr == "" {
		log.Println("⚠️  SUPABASE_DB_URL no configurado. Usando datos Mock.")
		return
	}

	var err error
	db, err = sql.Open("pgx", connStr)
	if err != nil {
		log.Printf("⚠️  Error abriendo conexión a DB. Usando Mock. Detalle: %v", err)
		return
	}
	if err = db.Ping(); err != nil {
		log.Printf("⚠️  Ping a Supabase falló. Activando modo Mock. Detalle: %v", err)
		return
	}
	log.Println("✅ Conexión a Supabase establecida.")
	dbConnected = true
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL") // formato: localhost:6379
	if redisURL == "" {
		log.Println("⚠️  REDIS_URL no configurado. Cache desactivado.")
		return
	}

	rdb = redis.NewClient(&redis.Options{Addr: redisURL})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  No se pudo conectar a Redis (%s). Cache desactivado. Detalle: %v", redisURL, err)
		rdb = nil
		return
	}
	log.Println("✅ Conectado a Redis. Cache activo con TTL =", cacheTTL)
	redisConnected = true
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

func cacheGet(ctx context.Context, key string) ([]Suggestion, bool) {
	if !redisConnected || rdb == nil {
		return nil, false
	}
	val, err := rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, false
	}
	var s []Suggestion
	if err := json.Unmarshal([]byte(val), &s); err != nil {
		return nil, false
	}
	log.Printf("🎯 Cache HIT: %s", key)
	return s, true
}

func cacheSet(ctx context.Context, key string, s []Suggestion) {
	if !redisConnected || rdb == nil {
		return
	}
	b, err := json.Marshal(s)
	if err != nil {
		return
	}
	if err := rdb.Set(ctx, key, b, cacheTTL).Err(); err != nil {
		log.Printf("⚠️  Error escribiendo en Redis: %v", err)
	}
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Handler principal de sugerencias
// ---------------------------------------------------------------------------

func suggestionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	productID := r.URL.Query().Get("product_id")

	// Clave de cache: diferente para best-sellers vs. relacionados
	cacheKey := "suggestions:best_sellers"
	if productID != "" {
		cacheKey = "suggestions:related:" + productID
	}

	// 1. Intentar cache primero
	if cached, ok := cacheGet(ctx, cacheKey); ok {
		json.NewEncoder(w).Encode(cached)
		return
	}

	// 2. Si no hay DB, retornar mocks
	if !dbConnected {
		json.NewEncoder(w).Encode(mockSuggestions)
		return
	}

	// 3. Consultar la base de datos
	var suggestions []Suggestion
	var rows *sql.Rows
	var err error

	if productID != "" {
		// Productos relacionados por categoría usando la función de Supabase
		rows, err = db.QueryContext(ctx,
			`SELECT id::text, name, price::float, COALESCE(image_url, '') FROM public.get_related_products($1::uuid, 5)`,
			productID)
		if err != nil {
			log.Printf("Error DB (related): %v", err)
			json.NewEncoder(w).Encode(mockSuggestions)
			return
		}
	} else {
		// Más vendidos: top 5 por campo sales
		rows, err = db.QueryContext(ctx,
			`SELECT id::text, name, price::float, COALESCE(image_url, '')
			 FROM public.products
			 WHERE is_active = true
			 ORDER BY sales DESC
			 LIMIT 5`)
		if err != nil {
			log.Printf("Error DB (best_sellers): %v", err)
			json.NewEncoder(w).Encode(mockSuggestions)
			return
		}
	}
	defer rows.Close()

	for rows.Next() {
		var s Suggestion
		if err := rows.Scan(&s.ID, &s.Name, &s.Price, &s.ImageURL); err == nil {
			if productID != "" {
				s.Reason = "Productos relacionados"
			} else {
				s.Reason = "Más vendidos"
			}
			suggestions = append(suggestions, s)
		}
	}

	// Fallback si la DB no devolvió nada
	if len(suggestions) == 0 {
		suggestions = mockSuggestions
	}

	// 4. Guardar en cache para la próxima petición
	cacheSet(ctx, cacheKey, suggestions)

	json.NewEncoder(w).Encode(suggestions)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	initDB()
	initRedis()

	if dbConnected {
		defer db.Close()
	}
	if redisConnected && rdb != nil {
		defer rdb.Close()
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		mode := "db+redis"
		if !dbConnected && !redisConnected {
			mode = "mocks"
		} else if !dbConnected {
			mode = "mocks (redis activo)"
		} else if !redisConnected {
			mode = "db (sin cache)"
		}
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "suggestions",
			"mode":    mode,
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
