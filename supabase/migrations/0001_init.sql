-- Ejecutar en Supabase (SQL Editor o `supabase db push`)

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  stock int not null default 0,
  category text,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'cliente', -- cliente | administrador | invitado
  full_name text
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status text not null default 'pendiente', -- pendiente | pagado | cancelado
  total numeric(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null,
  unit_price numeric(10,2) not null
);

-- Row Level Security
alter table products enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Catálogo público: cualquiera (incluso invitado) puede leer productos
create policy "catalogo publico de lectura"
  on products for select
  using (true);

-- Solo administradores pueden escribir productos
create policy "admin escribe productos"
  on products for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'administrador')
  );

-- Cada usuario solo ve/edita su propio perfil
create policy "usuario ve su propio perfil"
  on profiles for select
  using (auth.uid() = id);

-- Cada usuario solo ve sus propias órdenes
create policy "usuario ve sus ordenes"
  on orders for select
  using (auth.uid() = user_id);

create policy "usuario crea sus ordenes"
  on orders for insert
  with check (auth.uid() = user_id);

-- Items de orden heredan el acceso de la orden padre
create policy "usuario ve items de sus ordenes"
  on order_items for select
  using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

-- Seed mínimo para probar el catálogo sin esperar al CRUD del microservicio
insert into products (name, price, stock, category) values
  ('Polo UNMSM', 45.90, 20, 'ropa'),
  ('Mochila Tech', 129.90, 8, 'accesorios')
on conflict do nothing;
