-- Extend orders for subtotal/discount/shipping and coupon linkage
alter table public.orders
  add column if not exists subtotal_cents integer not null default 0,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists shipping_cents integer not null default 0,
  add column if not exists shipping_option text,
  add column if not exists coupon_id uuid references public.coupons(id),
  add column if not exists coupon_snapshot jsonb,
  add column if not exists email_sent_at timestamptz;

update public.orders
set subtotal_cents = case when subtotal_cents = 0 then total_cents else subtotal_cents end,
    shipping_cents = case when shipping_cents = 0 then 0 else shipping_cents end,
    discount_cents = case when discount_cents = 0 then 0 else discount_cents end
where true;

create index if not exists orders_coupon_id_idx on public.orders(coupon_id);

alter table public.coupons
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists min_order_cents integer,
  add column if not exists usage_limit_per_user integer;
