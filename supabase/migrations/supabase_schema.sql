-- =========================================================
-- E-COMMERCE UNMSM - MICROSERVICIOS
-- Base de datos unificada para los 6 roles del proyecto
-- =========================================================

-- ---------------------------------------------------------
-- 1) EXTENSIONES
-- ---------------------------------------------------------
create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ---------------------------------------------------------
-- 2) TABLA: profiles (EXTIENDE auth.users)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'cliente' check (role in ('cliente', 'administrador', 'invitado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para crear profile automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'cliente'
  );
  return new;
end;
$$;

-- Solo crear el trigger si no existe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 3) TABLA: categories
-- ---------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4) TABLA: products (con todos los campos necesarios)
-- ---------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  sales int not null default 0, -- para "más vendidos"
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para mejorar performance
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_products_sales on public.products(sales);

-- ---------------------------------------------------------
-- 5) TABLA: orders
-- ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'enviado', 'cancelado')),
  total numeric(10,2) not null check (total >= 0),
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_stripe on public.orders(stripe_payment_intent_id);

-- ---------------------------------------------------------
-- 6) TABLA: order_items
-- ---------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- =========================================================
-- 7) ROW LEVEL SECURITY (RLS) UNIFICADO
-- =========================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Función helper: verificar si usuario es administrador
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'administrador'
  );
$$;

-- ---------- PROFILES ----------
-- Cada usuario ve y edita su propio perfil; admin ve todos
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- CATEGORIES ----------
-- Lectura pública para todos (incluye invitados)
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (true);

-- Solo admin escribe
drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- PRODUCTS ----------
-- Invitados y clientes: solo lectura, solo productos activos
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

-- Solo admin puede escribir
drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using (public.is_admin());

-- ---------- ORDERS ----------
-- Cliente ve y crea solo sus propias órdenes; admin ve todas
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admin puede actualizar manualmente
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- ORDER_ITEMS ----------
-- Visible si el usuario es dueño de la orden padre, o es admin
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
  on public.order_items for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- =========================================================
-- 8) SEED DATA (datos de prueba para desarrollo)
-- =========================================================

-- Categorías base
insert into public.categories (name, slug) values
  ('Electrónicos', 'electronicos'),
  ('Ropa', 'ropa'),
  ('Hogar', 'hogar'),
  ('Deportes', 'deportes'),
  ('Libros', 'libros')
on conflict (slug) do nothing;

-- Productos de ejemplo (catálogo inicial)
insert into public.products (name, description, price, stock, category_id, image_url, is_active)
select 
  'Producto ' || g,
  'Descripción del producto ' || g,
  (10 + (g * 5))::numeric,
  50,
  (select id from public.categories order by random() limit 1),
  'https://via.placeholder.com/200',
  true
from generate_series(1, 10) g
on conflict do nothing;

-- Productos específicos que menciona el proyecto
insert into public.products (name, description, price, stock, category_id, image_url, is_active)
values
  ('Polo UNMSM', 'Polo deportivo con el logo de la UNMSM', 45.90, 20, 
   (select id from public.categories where slug = 'ropa'), 'https://via.placeholder.com/200', true),
  ('Mochila Tech', 'Mochila con compartimento para laptop', 129.90, 8, 
   (select id from public.categories where slug = 'electronicos'), 'https://via.placeholder.com/200', true)
on conflict do nothing;

-- =========================================================
-- 9) FUNCIONES UTILITARIAS PARA LOS MICROSERVICIOS
-- =========================================================

-- Función para obtener productos más vendidos (para el servicio de sugerencias)
create or replace function public.get_best_sellers(limit_count int default 5)
returns table (
  product_id uuid,
  product_name text,
  total_sales int,
  total_revenue numeric
)
language sql
security definer set search_path = public
as $$
  select 
    p.id as product_id,
    p.name as product_name,
    coalesce(sum(oi.quantity), 0)::int as total_sales,
    coalesce(sum(oi.quantity * oi.unit_price), 0)::numeric as total_revenue
  from public.products p
  left join public.order_items oi on oi.product_id = p.id
  left join public.orders o on o.id = oi.order_id and o.status = 'pagado'
  group by p.id, p.name
  order by total_sales desc
  limit limit_count;
$$;

-- Función para obtener productos relacionados por categoría
create or replace function public.get_related_products(product_id uuid, limit_count int default 5)
returns table (
  id uuid,
  name text,
  price numeric,
  image_url text,
  similarity float
)
language sql
security definer set search_path = public
as $$
  with target_category as (
    select category_id 
    from public.products 
    where id = product_id
  )
  select 
    p.id,
    p.name,
    p.price,
    p.image_url,
    1.0 as similarity
  from public.products p
  cross join target_category tc
  where p.category_id = tc.category_id 
    and p.id != product_id
    and p.is_active = true
  order by p.sales desc
  limit limit_count;
$$;
