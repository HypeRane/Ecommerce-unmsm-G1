package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Product struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Stock    int     `json:"stock"`
	Category string  `json:"category,omitempty"`
	Active   bool    `json:"active"`
}

type paginationMeta struct {
    Page  int `json:"page"`
    Limit int `json:"limit"`
    Total int `json:"total"`
    Pages int `json:"pages"`
}

type productListResponse struct {
    Items []Product       `json:"items"`
    Meta  paginationMeta `json:"meta"`
}

var db *pgxpool.Pool

func init() {
    ctx := context.Background()
    supabaseURL := os.Getenv("SUPABASE_DB_URL")
    if supabaseURL == "" {
        log.Fatal("SUPABASE_DB_URL not set")
    }

    var err error
    db, err = pgxpool.New(ctx, supabaseURL)
    if err != nil {
        log.Fatalf("Unable to connect to database: %v\n", err)
    }

    // Verificar conexión
    err = db.Ping(ctx)
    if err != nil {
        log.Fatalf("Unable to ping database: %v\n", err)
    }
    log.Println("Connected to Supabase successfully")
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
    origin := os.Getenv("FRONTEND_ORIGIN")
    if origin == "" {
        origin = "*"
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
    defer db.Close()

    mux := http.NewServeMux()

    mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "catalog-users"})
    }))

    mux.HandleFunc("GET /products", withCORS(func(w http.ResponseWriter, r *http.Request) {
        page, _ := strconv.Atoi(r.URL.Query().Get("page"))
        limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
        search := r.URL.Query().Get("search")
        category := r.URL.Query().Get("category")
        sort := r.URL.Query().Get("sort")

        if page < 1 {
            page = 1
        }
        if limit < 1 {
            limit = 10
        }

        // Construir query
        query := `SELECT id::text, name, price::float, stock, 'uncategorized'::text as category, is_active FROM public.products WHERE is_active = true`

        if search != "" {
            query += fmt.Sprintf(` AND name ILIKE '%%%s%%'`, strings.ReplaceAll(search, "'", "''"))
        }
        if category != "" {
            query += fmt.Sprintf(` AND category ILIKE '%%%s%%'`, strings.ReplaceAll(category, "'", "''"))
        }

        // Contar total
        countQuery := strings.ReplaceAll(query, "SELECT id::text, name, price::float, stock, 'uncategorized'::text as category, is_active", "SELECT COUNT(*)")
        var total int
        db.QueryRow(context.Background(), countQuery).Scan(&total)

        // Aplicar orden
        switch sort {
        case "price_asc":
            query += " ORDER BY price ASC"
        case "price_desc":
            query += " ORDER BY price DESC"
        case "name_desc":
            query += " ORDER BY name DESC"
        default:
            query += " ORDER BY name ASC"
        }

        // Aplicar paginación
        offset := (page - 1) * limit
        query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

        rows, err := db.Query(context.Background(), query)
        if err != nil {
            http.Error(w, `{"error":"query error"}`, http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        var items []Product
        for rows.Next() {
            var p Product
            if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock, &p.Category, &p.Active); err != nil {
                log.Printf("scan error: %v", err)
                continue
            }
            items = append(items, p)
        }

        pages := (total + limit - 1) / limit
        if pages < 1 {
            pages = 1
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(productListResponse{
            Items: items,
            Meta: paginationMeta{
                Page:  page,
                Limit: limit,
                Total: total,
                Pages: pages,
            },
        })
    }))

    mux.HandleFunc("GET /products/{id}", withCORS(func(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var p Product
        err := db.QueryRow(context.Background(),
            `SELECT id::text, name, price::float, stock, 'uncategorized'::text as category, is_active FROM public.products WHERE id = $1 AND is_active = true`,
            id).Scan(&p.ID, &p.Name, &p.Price, &p.Stock, &p.Category, &p.Active)

        if err != nil {
            http.Error(w, `{"error":"product not found"}`, http.StatusNotFound)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(p)
    }))

    mux.HandleFunc("POST /products", withCORS(func(w http.ResponseWriter, r *http.Request) {
        var p Product
        if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
            http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
            return
        }

        var newID string
        err := db.QueryRow(context.Background(),
            `INSERT INTO public.products (name, price, stock, is_active) VALUES ($1, $2, $3, true) RETURNING id::text`,
            p.Name, p.Price, p.Stock).Scan(&newID)

        if err != nil {
            http.Error(w, `{"error":"insert failed"}`, http.StatusInternalServerError)
            return
        }

        p.ID = newID
        p.Active = true
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(p)
    }))

    mux.HandleFunc("PUT /products/{id}", withCORS(func(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var p Product
        if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
            http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
            return
        }

        cmdTag, err := db.Exec(context.Background(),
            `UPDATE public.products SET name = $1, price = $2, stock = $3 WHERE id = $4`,
            p.Name, p.Price, p.Stock, id)

        if err != nil {
            http.Error(w, `{"error":"update failed"}`, http.StatusInternalServerError)
            return
        }

        if cmdTag.RowsAffected() == 0 {
            http.Error(w, `{"error":"product not found"}`, http.StatusNotFound)
            return
        }

        p.ID = id
        p.Active = true
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(p)
    }))

    mux.HandleFunc("DELETE /products/{id}", withCORS(func(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        cmdTag, err := db.Exec(context.Background(),
            `DELETE FROM public.products WHERE id = $1`,
            id)

        if err != nil {
            http.Error(w, `{"error":"delete failed"}`, http.StatusInternalServerError)
            return
        }

        if cmdTag.RowsAffected() == 0 {
            http.Error(w, `{"error":"product not found"}`, http.StatusNotFound)
            return
        }

        w.WriteHeader(http.StatusNoContent)
    }))

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }
    log.Printf("catalog-users escuchando en :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, mux))
}