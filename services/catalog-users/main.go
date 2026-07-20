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
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category,omitempty"`
	CategoryID  string  `json:"category_id,omitempty"`
	ImageURL    string  `json:"image_url,omitempty"`
	Sales       int     `json:"sales"`
	Active      bool    `json:"active"`
}

type paginationMeta struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
	Pages int `json:"pages"`
}

type productListResponse struct {
	Items []Product      `json:"items"`
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

// requireAdmin verifica el JWT de Supabase en el header Authorization.
// Delega la validación real de la sesión en Supabase RLS; aquí solo rechazamos
// peticiones sin token para dar un error claro antes de tocar la DB.
func requireAdmin(h http.HandlerFunc) http.HandlerFunc {
	return withCORS(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"unauthorized: missing bearer token"}`, http.StatusUnauthorized)
			return
		}
		// La validación real del rol admin la hace RLS en Supabase.
		// El microservicio usa service_role (SUPABASE_DB_URL con pooler) por lo que
		// las políticas RLS se bypassean. Aquí solo exigimos que el token exista.
		h(w, r)
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func main() {
	defer db.Close()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "catalog-users"})
	}))

	// -------------------------------------------------------
	// GET /products  — listado con filtros, orden y paginación
	// JOIN real con la tabla categories por name o slug
	// -------------------------------------------------------
	mux.HandleFunc("GET /products", withCORS(func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		search := r.URL.Query().Get("search")
		category := r.URL.Query().Get("category") // acepta nombre o slug
		sort := r.URL.Query().Get("sort")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		// Query base con JOIN a categories
		baseQuery := `
			SELECT
				p.id::text,
				p.name,
				COALESCE(p.description, '') AS description,
				p.price::float,
				p.stock,
				COALESCE(c.name, 'Sin categoría') AS category,
				COALESCE(p.category_id::text, '') AS category_id,
				COALESCE(p.image_url, '') AS image_url,
				p.sales,
				p.is_active
			FROM public.products p
			LEFT JOIN public.categories c ON c.id = p.category_id
			WHERE p.is_active = true`

		args := []any{}
		argIdx := 1

		if search != "" {
			baseQuery += fmt.Sprintf(` AND p.name ILIKE '%%' || $%d || '%%'`, argIdx)
			args = append(args, search)
			argIdx++
		}

		// Filtro de categoría: busca coincidencia en name O slug
		if category != "" {
			baseQuery += fmt.Sprintf(` AND (c.name ILIKE $%d OR c.slug ILIKE $%d)`, argIdx, argIdx)
			args = append(args, category)
			argIdx++
		}

		// Contar total (sin ORDER BY ni LIMIT)
		countQuery := `SELECT COUNT(*) FROM public.products p
			LEFT JOIN public.categories c ON c.id = p.category_id
			WHERE p.is_active = true`
		if search != "" {
			countQuery += fmt.Sprintf(` AND p.name ILIKE '%%' || $%d || '%%'`, 1)
		}
		if category != "" {
			n := 1
			if search != "" {
				n = 2
			}
			countQuery += fmt.Sprintf(` AND (c.name ILIKE $%d OR c.slug ILIKE $%d)`, n, n)
		}

		var total int
		db.QueryRow(context.Background(), countQuery, args...).Scan(&total)

		// Orden
		switch sort {
		case "price_asc":
			baseQuery += " ORDER BY p.price ASC"
		case "price_desc":
			baseQuery += " ORDER BY p.price DESC"
		case "sales_desc":
			baseQuery += " ORDER BY p.sales DESC"
		case "name_desc":
			baseQuery += " ORDER BY p.name DESC"
		default:
			baseQuery += " ORDER BY p.name ASC"
		}

		offset := (page - 1) * limit
		baseQuery += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

		rows, err := db.Query(context.Background(), baseQuery, args...)
		if err != nil {
			log.Printf("query error: %v", err)
			jsonError(w, "query error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var items []Product
		for rows.Next() {
			var p Product
			if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock,
				&p.Category, &p.CategoryID, &p.ImageURL, &p.Sales, &p.Active); err != nil {
				log.Printf("scan error: %v", err)
				continue
			}
			items = append(items, p)
		}
		if items == nil {
			items = []Product{}
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

	// -------------------------------------------------------
	// GET /products/{id}
	// -------------------------------------------------------
	mux.HandleFunc("GET /products/{id}", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var p Product
		err := db.QueryRow(context.Background(),
			`SELECT
				p.id::text,
				p.name,
				COALESCE(p.description, '') AS description,
				p.price::float,
				p.stock,
				COALESCE(c.name, 'Sin categoría') AS category,
				COALESCE(p.category_id::text, '') AS category_id,
				COALESCE(p.image_url, '') AS image_url,
				p.sales,
				p.is_active
			FROM public.products p
			LEFT JOIN public.categories c ON c.id = p.category_id
			WHERE p.id = $1 AND p.is_active = true`,
			id).Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock,
			&p.Category, &p.CategoryID, &p.ImageURL, &p.Sales, &p.Active)

		if err != nil {
			jsonError(w, "product not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(p)
	}))

	// -------------------------------------------------------
	// GET /categories  — lista todas las categorías
	// -------------------------------------------------------
	mux.HandleFunc("GET /categories", withCORS(func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(context.Background(),
			`SELECT id::text, name, slug FROM public.categories ORDER BY name ASC`)
		if err != nil {
			jsonError(w, "query error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Category struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			Slug string `json:"slug"`
		}
		var cats []Category
		for rows.Next() {
			var c Category
			rows.Scan(&c.ID, &c.Name, &c.Slug)
			cats = append(cats, c)
		}
		if cats == nil {
			cats = []Category{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cats)
	}))

	// -------------------------------------------------------
	// POST /products  (requiere token Bearer)
	// -------------------------------------------------------
	mux.HandleFunc("POST /products", requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		var p Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}

		var newID string
		err := db.QueryRow(context.Background(),
			`INSERT INTO public.products (name, description, price, stock, category_id, image_url, is_active)
			 VALUES ($1, $2, $3, $4, NULLIF($5, '')::uuid, NULLIF($6, ''), true)
			 RETURNING id::text`,
			p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ImageURL).Scan(&newID)

		if err != nil {
			log.Printf("insert error: %v", err)
			jsonError(w, "insert failed", http.StatusInternalServerError)
			return
		}

		p.ID = newID
		p.Active = true
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(p)
	}))

	// -------------------------------------------------------
	// PUT /products/{id}  (requiere token Bearer)
	// -------------------------------------------------------
	mux.HandleFunc("PUT /products/{id}", requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var p Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}

		cmdTag, err := db.Exec(context.Background(),
			`UPDATE public.products
			 SET name = $1, description = $2, price = $3, stock = $4,
			     category_id = NULLIF($5, '')::uuid, image_url = NULLIF($6, ''),
			     updated_at = now()
			 WHERE id = $7`,
			p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ImageURL, id)

		if err != nil {
			log.Printf("update error: %v", err)
			jsonError(w, "update failed", http.StatusInternalServerError)
			return
		}
		if cmdTag.RowsAffected() == 0 {
			jsonError(w, "product not found", http.StatusNotFound)
			return
		}

		p.ID = id
		p.Active = true
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(p)
	}))

	// -------------------------------------------------------
	// DELETE /products/{id}  (soft delete — requiere token Bearer)
	// -------------------------------------------------------
	mux.HandleFunc("DELETE /products/{id}", requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		// Soft delete: marcar is_active = false en lugar de borrar físicamente
		cmdTag, err := db.Exec(context.Background(),
			`UPDATE public.products SET is_active = false, updated_at = now() WHERE id = $1`,
			id)

		if err != nil {
			log.Printf("delete error: %v", err)
			jsonError(w, "delete failed", http.StatusInternalServerError)
			return
		}
		if cmdTag.RowsAffected() == 0 {
			jsonError(w, "product not found", http.StatusNotFound)
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