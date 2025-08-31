-- Ensure pgcrypto for UUIDs
create extension if not exists pgcrypto;

-- Create products table if missing
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

-- RLS
alter table public.products enable row level security;

create policy if not exists "Read active products" on public.products
for select using (is_active = true);

create policy if not exists "Admins manage products" on public.products
for all using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

-- Seed a starter catalog using local image paths under /public/images
insert into public.products (name, slug, category, price_cents, image_url, is_active) values
  ('California Almonds [500gm]', 'california-almonds-500', 'Nidhis Dry Fruits', 184000, '/images/dryfruits/California Almonds.png', true),
  ('Black Dates [500gm]', 'black-dates-500', 'Nidhis Dry Fruits', 149900, '/images/dryfruits/black-dates.jpg', true),
  ('Blueberry [250gm]', 'blueberry-250', 'Super Food', 159900, '/images/dryfruits/Blueberry .jpg', true),
  ('Cranberry [250gm]', 'cranberry-250', 'Super Food', 154000, '/images/dryfruits/cranberry-fruit-seeds.jpg', true),
  ('Chilgoza [250gm]', 'chilgoza-250', 'Super Food', 1299900, '/images/dryfruits/Chilgoza .jpg', true),
  ('Mixed Fruits, Seeds & Nuts [500gm]', 'mixed-fruits-seeds-nuts-500', 'Super Food', 189900, '/images/dryfruits/Mixed Fruits, Seeds & Nuts.png', true),
  ('Mukhwas [100gm]', 'mukhwas-100', 'Nidhis Spices', 110900, '/images/dryfruits/Mukhwas.jpg', true),
  ('Cumin Powder [100gm]', 'cumin-powder-100', 'Nidhis Spices', 19900, '/images/dryfruits/Cumin Powder.jpg', true),
  ('Jain Sabji Masala [100gm]', 'jain-sabji-masala-100', 'Nidhis Spices', 113900, '/images/dryfruits/Jain Sabji Masala .jpg', true),
  ('Black Cardamom [100gm]', 'black-cardamom-100', 'Nidhis Whole Spices', 122500, '/images/dryfruits/Black Cardamom .jpg', true),
  ('Black Pepper [100gm]', 'black-pepper-100', 'Nidhis Whole Spices', 119900, '/images/dryfruits/Black-pepper-whole-.jpg', true),
  ('Cumin Seeds [100gm]', 'cumin-seeds-100', 'Nidhis Whole Spices', 112500, '/images/dryfruits/Cumin Seeds .jpg', true),
  ('Green Cardamom [100gm]', 'green-cardamom-100', 'Nidhis Whole Spices', 134900, '/images/dryfruits/Green Cardamom .jpg', true)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  is_active = excluded.is_active;

