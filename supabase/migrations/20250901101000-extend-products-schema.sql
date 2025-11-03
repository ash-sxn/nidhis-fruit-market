-- Extend products schema with description, mrp, updated_at, and inventory placeholder
alter table public.products
  add column if not exists description text,
  add column if not exists mrp_cents integer,
  add column if not exists inventory integer default 0,
  add column if not exists updated_at timestamptz default now();

-- Backfill description and mrp for existing rows
update public.products
set description = coalesce(description, 'Premium dry fruits sourced by Nidhis. Fresh, flavorful, and perfect for gifting.'),
    inventory = coalesce(inventory, 100);

-- Ensure mrp is always >= price when provided
update public.products
set mrp_cents = greatest(price_cents, coalesce(mrp_cents, price_cents));

-- Trigger to maintain updated_at timestamp
create or replace function public.products_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.products;
create trigger set_timestamp
before update on public.products
for each row
execute procedure public.products_set_updated_at();

-- Helpful index for category filtering already exists via queries; add composite for category+is_active
create index if not exists products_category_active_idx
  on public.products(category, is_active);
