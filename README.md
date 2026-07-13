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
