create type public.coupon_type as enum ('percent','flat');
create type public.order_status as enum ('pending','paid','fulfilled','cancelled');

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.order_status not null default 'pending',
  total_cents integer not null,
  currency text not null default 'INR',
  address_snapshot jsonb not null,
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name_snapshot text not null,
  price_cents_snapshot integer not null,
  quantity integer not null default 1
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type public.coupon_type not null,
  value integer not null,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0
);

create or replace function public.orders_set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_order_updated_at on public.orders;
create trigger set_order_updated_at before update on public.orders for each row execute procedure public.orders_set_updated_at();

create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;

-- Recreate policies (CREATE POLICY does not support IF NOT EXISTS)
drop policy if exists "Addresses are readable by owner" on public.addresses;
drop policy if exists "Addresses are writable by owner" on public.addresses;
create policy "Addresses are readable by owner" on public.addresses for select using (auth.uid() = user_id);
create policy "Addresses are writable by owner" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Orders readable by owner" on public.orders;
drop policy if exists "Orders insert by owner" on public.orders;
create policy "Orders readable by owner" on public.orders for select using (auth.uid() = user_id);
create policy "Orders insert by owner" on public.orders for insert with check (auth.uid() = user_id);

drop policy if exists "Order items by owner" on public.order_items;
drop policy if exists "Order items insert by owner" on public.order_items;
create policy "Order items by owner" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "Order items insert by owner" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

drop policy if exists "Coupons readable" on public.coupons;
create policy "Coupons readable" on public.coupons for select using (true);
