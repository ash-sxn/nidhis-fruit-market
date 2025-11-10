-- Product variants provide weight/size specific pricing and inventory
begin;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  grams integer,
  price_cents integer not null,
  mrp_cents integer,
  inventory integer not null default 0,
  sku text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);
create unique index if not exists product_variants_product_label_uidx on public.product_variants(product_id, lower(label));
create unique index if not exists product_variants_one_default_uidx on public.product_variants(product_id) where is_default is true;

create or replace function public.product_variants_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_product_variant_updated_at on public.product_variants;
create trigger set_product_variant_updated_at
before update on public.product_variants
for each row execute procedure public.product_variants_set_updated_at();

alter table public.products
  add column if not exists default_variant_id uuid;

-- Seed default variants for existing catalog
with seeded as (
  insert into public.product_variants (product_id, label, grams, price_cents, mrp_cents, inventory, is_active, is_default)
  select
    p.id,
    coalesce(nullif(p.slug, ''), 'Standard'),
    null,
    p.price_cents,
    p.mrp_cents,
    coalesce(p.inventory, 0),
    coalesce(p.is_active, true),
    true
  from public.products p
  where not exists (
    select 1 from public.product_variants pv where pv.product_id = p.id
  )
  returning id, product_id
)
update public.products p
set default_variant_id = seeded.id
from seeded
where p.id = seeded.product_id;

alter table public.products
  add constraint products_default_variant_id_fkey
  foreign key (default_variant_id) references public.product_variants(id)
  on delete set null;

-- Always reflect the chosen default variant on the product record
create or replace function public.refresh_product_from_variants(p_product_id uuid)
returns void
language plpgsql
as $$
declare
  v_variant record;
begin
  select pv.*
  into v_variant
  from public.product_variants pv
  where pv.product_id = p_product_id
  order by pv.is_default desc, pv.sort_order asc, pv.created_at asc
  limit 1;

  if not found then
    update public.products
    set default_variant_id = null,
        price_cents = 0,
        mrp_cents = null,
        inventory = 0
    where id = p_product_id;
    return;
  end if;

  update public.products
  set default_variant_id = v_variant.id,
      price_cents = v_variant.price_cents,
      mrp_cents = coalesce(v_variant.mrp_cents, v_variant.price_cents),
      inventory = coalesce(v_variant.inventory, 0)
  where id = p_product_id;
end;
$$;

create or replace function public.product_variants_after_change()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.refresh_product_from_variants(old.product_id);
    return old;
  end if;

  if new.is_default is true then
    update public.product_variants
    set is_default = false
    where product_id = new.product_id
      and id <> new.id
      and is_default = true;
  end if;

  -- Ensure we always have a default variant recorded on products table
  perform public.refresh_product_from_variants(new.product_id);
  return new;
end;
$$;

drop trigger if exists product_variants_after_change_tgr on public.product_variants;
create trigger product_variants_after_change_tgr
after insert or update or delete on public.product_variants
for each row execute procedure public.product_variants_after_change();

-- Cart items now reference variants
alter table public.cart_items
  add column if not exists variant_id uuid;

update public.cart_items ci
set variant_id = p.default_variant_id
from public.products p
where ci.product_id = p.id
  and ci.variant_id is null;

alter table public.cart_items
  alter column variant_id set not null;

alter table public.cart_items
  drop constraint if exists cart_items_variant_id_fkey;

alter table public.cart_items
  add constraint cart_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id);

drop index if exists cart_items_user_product_uidx;
create unique index if not exists cart_items_user_variant_uidx
  on public.cart_items(user_id, product_id, variant_id);

-- Order items capture variant snapshot
alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_label text,
  add column if not exists variant_grams integer;

update public.order_items oi
set variant_id = coalesce(oi.variant_id, p.default_variant_id),
    variant_label = coalesce(oi.variant_label, pv.label),
    variant_grams = coalesce(oi.variant_grams, pv.grams)
from public.products p
left join public.product_variants pv on pv.id = p.default_variant_id
where oi.product_id = p.id;

alter table public.order_items
  alter column variant_id set not null;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id);

-- Restock function now restores variant inventory
create or replace function public.restock_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.product_variants
    set inventory = coalesce(inventory, 0) + v_item.quantity
    where id = v_item.variant_id;
  end loop;

  -- Sync product cache
  for v_item in
    select distinct pv.product_id
    from public.product_variants pv
    join public.order_items oi on oi.variant_id = pv.id
    where oi.order_id = p_order_id
  loop
    perform public.refresh_product_from_variants(v_item.product_id);
  end loop;
end;
$$;

-- Order creation function uses variants for pricing and inventory
create or replace function public.create_order_with_items(
  p_currency text,
  p_address jsonb,
  p_items jsonb,
  p_shipping_cents integer default 0,
  p_shipping_option text default null,
  p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_subtotal integer := 0;
  v_total integer := 0;
  v_shipping integer := greatest(coalesce(p_shipping_cents, 0), 0);
  v_shipping_option text := p_shipping_option;
  v_coupon_code text := nullif(trim(coalesce(p_coupon_code, '')), '');
  v_coupon public.coupons%rowtype;
  v_discount integer := 0;
  v_coupon_snapshot jsonb;
  v_item jsonb;
  v_qty integer;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart empty';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce(nullif(v_item->>'quantity','')::integer, 1);
    if v_qty <= 0 then
      raise exception 'Invalid quantity for %', coalesce(v_item->>'product_id', 'product');
    end if;

    select *
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found or v_product.is_active is not true then
      raise exception 'Product % unavailable', coalesce(v_product.name, v_item->>'product_id');
    end if;

    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    if v_variant_id is null then
      v_variant_id := v_product.default_variant_id;
    end if;

    if v_variant_id is null then
      raise exception 'Product % has no purchasable variants', v_product.name;
    end if;

    select *
    into v_variant
    from public.product_variants
    where id = v_variant_id
      and product_id = v_product.id
    for update;

    if not found or v_variant.is_active is not true then
      raise exception 'Variant unavailable for %', v_product.name;
    end if;

    if coalesce(v_variant.inventory, 0) < v_qty then
      raise exception 'Only % units left for % (%).', v_variant.inventory, v_product.name, v_variant.label;
    end if;

    v_subtotal := v_subtotal + v_variant.price_cents * v_qty;
  end loop;

  if v_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where lower(code) = lower(v_coupon_code)
    for update;

    if not found or v_coupon.is_active is not true then
      raise exception 'Coupon % is invalid', v_coupon_code;
    end if;

    if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
      raise exception 'Coupon % is not active yet', v_coupon.code;
    end if;

    if v_coupon.ends_at is not null and now() > v_coupon.ends_at then
      raise exception 'Coupon % has expired', v_coupon.code;
    end if;

    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'Coupon % has reached its usage limit', v_coupon.code;
    end if;

    if v_coupon.min_order_cents is not null and v_subtotal < v_coupon.min_order_cents then
      raise exception 'Coupon % requires a minimum order of ₹%', v_coupon.code, round(v_coupon.min_order_cents / 100.0, 2);
    end if;

    if v_coupon.usage_limit_per_user is not null then
      if (
        select count(*)
        from public.orders o
        where o.user_id = v_user_id
          and o.coupon_id = v_coupon.id
          and o.status in ('paid','fulfilled')
      ) >= v_coupon.usage_limit_per_user then
        raise exception 'Coupon % already used the maximum times on this account', v_coupon.code;
      end if;
    end if;

    if v_coupon.type = 'percent' then
      v_discount := round(v_subtotal * (v_coupon.value::numeric / 100.0));
    else
      v_discount := v_coupon.value;
    end if;

    if v_discount > v_subtotal then
      v_discount := v_subtotal;
    end if;

    v_coupon_snapshot := jsonb_build_object(
      'id', v_coupon.id,
      'code', v_coupon.code,
      'type', v_coupon.type,
      'value', v_coupon.value
    );
  end if;

  v_total := v_subtotal + v_shipping - v_discount;
  if v_total < 0 then v_total := 0; end if;

  insert into public.orders (
    user_id,
    status,
    total_cents,
    currency,
    address_snapshot,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    shipping_option,
    coupon_id,
    coupon_snapshot
  ) values (
    v_user_id,
    'pending',
    v_total,
    coalesce(p_currency, 'INR'),
    coalesce(p_address, '{}'::jsonb),
    v_subtotal,
    v_discount,
    v_shipping,
    v_shipping_option,
    v_coupon.id,
    v_coupon_snapshot
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce(nullif(v_item->>'quantity','')::integer, 1);
    select *
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    v_variant_id := nullif(v_item->>'variant_id','')::uuid;
    if v_variant_id is null then
      v_variant_id := v_product.default_variant_id;
    end if;

    select *
    into v_variant
    from public.product_variants
    where id = v_variant_id
      and product_id = v_product.id
    for update;

    update public.product_variants
      set inventory = coalesce(inventory, 0) - v_qty
      where id = v_variant.id;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      name_snapshot,
      price_cents_snapshot,
      quantity,
      variant_label,
      variant_grams
    ) values (
      v_order_id,
      v_product.id,
      v_variant.id,
      v_product.name,
      v_variant.price_cents,
      v_qty,
      v_variant.label,
      v_variant.grams
    );
  end loop;

  for v_product in
    select distinct (item->>'product_id')::uuid as product_id
    from jsonb_array_elements(p_items) as item
  loop
    perform public.refresh_product_from_variants(v_product.product_id);
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'shipping_cents', v_shipping,
    'total_cents', v_total,
    'coupon_applied', v_coupon.id is not null
  );
end;
$$;

grant execute on function public.create_order_with_items(text, jsonb, jsonb, integer, text, text)
  to authenticated;

-- RLS for new table
alter table public.product_variants enable row level security;

drop policy if exists "Read active variants" on public.product_variants;
create policy "Read active variants"
  on public.product_variants
  for select
  using (
    is_active = true
    and exists (
      select 1 from public.products p
      where p.id = product_id
        and coalesce(p.is_active, true) = true
    )
  );

drop policy if exists "Admins manage variants" on public.product_variants;
create policy "Admins manage variants"
  on public.product_variants
  for all
  using (
    auth.role() = 'service_role'
    or public.is_admin(auth.uid())
  )
  with check (
    auth.role() = 'service_role'
    or public.is_admin(auth.uid())
  );

commit;
