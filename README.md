# E-Commerce UNMSM — Microservicios orientados a eventos

Stack: Next.js · Go (stdlib, sin frameworks pesados) · Supabase (Postgres + Auth + RLS) · Redis · Stripe · Docker · Render + Vercel

## Por qué está armado así

El profesor fue claro: **lo que más pesa en la nota es verlo funcionando en la nube**, no la cantidad de features. Por eso:

- Los 3 microservicios usan **solo la librería estándar de Go** (nada de `go get` de por medio) → compilan y se despliegan en segundos, sin sorpresas de dependencias el día de la sustentación.
- Cada servicio responde con **datos mock** desde el minuto uno → pueden desplegar TODO hoy mismo, antes de tener la lógica real, y luego ir reemplazando los mocks sin romper el pipeline.
- `render.yaml` despliega los 3 servicios de un jalón. `docker-compose.yml` es solo para probar en tu laptop.

## Orden recomendado (Día 1, primeras 2 horas — antes de escribir features)

1. Suban este repo a GitHub.
2. Creen el proyecto en **Supabase** (gratis) y corran `supabase/migrations/0001_init.sql` en el SQL Editor.
3. En **Render**: New → Blueprint → conecten el repo → detecta `render.yaml` → completen las env vars marcadas `sync: false`.
4. En **Vercel**: importen la carpeta `frontend/` como proyecto → agreguen las variables de `.env.local.example` con las URLs reales de Render.
5. Verifiquen que las 3 URLs de Render respondan `/health` y que `frontend-url.vercel.app/catalogo` muestre los productos mock.

Si esto funciona, **ya tienen lo que el profesor pidió como prioridad absoluta**, incluso sin una sola feature real todavía. Todo lo demás se construye encima de esto.

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
