-- Add shipping metadata to orders for Shiprocket integration
alter table public.orders
  add column if not exists shipping_provider text,
  add column if not exists shipping_awb text,
  add column if not exists shipping_status text default 'pending',
  add column if not exists shipping_tracking_url text,
  add column if not exists shipping_label_url text,
  add column if not exists shipping_meta jsonb,
  add column if not exists shipping_synced_at timestamptz;

create index if not exists orders_shipping_status_idx on public.orders(shipping_status);
create index if not exists orders_shipping_awb_idx on public.orders(shipping_awb);
