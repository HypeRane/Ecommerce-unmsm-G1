# E-Commerce UNMSM — Microservicios orientados a eventos

Stack: Next.js · Go (stdlib, sin frameworks pesados) · Supabase (Postgres + Auth + RLS) · Redis · Stripe · Docker · Render + Vercel

- Los 3 microservicios usan **solo la librería estándar de Go** (nada de `go get` de por medio) → compilan y se despliegan en segundos.
- Cada servicio responde con **datos mock** desde el minuto uno.
- `render.yaml` despliega los 3 servicios de un jalón. `docker-compose.yml`

## Estructura

```
services/catalog-users/   → CRUD productos y perfiles (mock -> Supabase)
services/payments/        → Stripe Payment Intents + webhook
services/suggestions/     → sugerencias simples (mock -> Redis opcional)
supabase/migrations/      → schema + RLS
frontend/                 → Next.js (App Router) + Tailwind
docker-compose.yml        → entorno local
render.yaml               → blueprint de despliegue en la nube
```

## Reemplazar los mocks por lógica real

- **catalog-users**: cambiar `mockProducts` por queries a `SUPABASE_DB_URL` (driver sugerido: `github.com/jackc/pgx/v5/stdlib`).
- **payments**: usar `github.com/stripe/stripe-go/v78` para crear el Payment Intent real y **verificar la firma del webhook** con `STRIPE_WEBHOOK_SECRET` (no te lo saltes, es lo único realmente crítico de seguridad acá).
- **suggestions**: reemplazar la lista fija por una query simple ("mismos category" o "más vendidos") y opcionalmente cachear en Redis.

Tarjeta de prueba de Stripe: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVV.


## 🗄️ Estado de la Base de Datos (✅ Ya Configurada)

### Base de datos en Supabase
La base de datos ya está creada y configurada con:
- **Tablas**: `products`, `profiles`, `categories`, `orders`, `order_items`
- **RLS (Row Level Security)**: Configurado con políticas para los 3 roles
- **Triggers**: Creación automática de perfiles al registrarse
- **Seed data**: Productos de prueba ya insertados

### 🔐 Acceso para el equipo
Todos los miembros del equipo tienen **rol de administrador** en Supabase.
- **Acceso**: Cada miembro recibió una invitación por email (@unmsm.edu.pe)

### 📋 Credenciales para desarrollo local

### Frontend (Next.js)
1. Crea un archivo `.env.local` en la carpeta `frontend/`
2. Copia este formato y reemplaza con tus credenciales:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica


📋 Resumen:
- Todos son administradores en Supabase
- Cada uno configura su propio .env para su servicio
- Las credenciales para frontend ya las tienen

🔑 Para backend :
Necesitan la URL de conexión a la base de datos:
postgresql://postgres:[CONTRASEÑA]@db.tzupmbmgymemmkhttyoo.supabase.co:5432/postgres
La contraseña la encuentran en Supabase → Settings → Database → Connection string.

📂 Cada servicio tiene su propio .env:
- catalog-users/.env 
- payments/.env   
- suggestions/.env 

👤 Frontend :
Usan el .env.local con estas credenciales 
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://tzupmbmgymemmkhttyoo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dXBtYm1neW1lbW1raHR0eW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjg4NTEsImV4cCI6MjA5OTY0NDg1MX0.Xoxup3n_hjVZl45BVMwdvvq_lcHwbV0hkp1TSBPDU8o



