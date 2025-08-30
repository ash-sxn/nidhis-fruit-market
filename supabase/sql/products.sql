-- 1) Enable UUIDs if not already done
create extension if not exists pgcrypto;

-- 2) Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category text not null,
  price_cents integer not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) RLS
alter table public.products enable row level security;

-- Anyone can read active products
create policy if not exists "Read active products" on public.products
for select using (is_active = true);

-- Only admins can write
create policy if not exists "Admins manage products" on public.products
for all using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

-- 4) Sample inserts (optional)
-- insert into public.products (name, slug, category, price_cents, image_url) values
-- ('Almond – California [500gm]', 'almond-california-500', 'Nidhis Dry Fruits', 184000, '/images/dryfruits/almonds.jpg');

