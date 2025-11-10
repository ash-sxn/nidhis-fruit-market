-- Fix create_order_with_items refresh loop to avoid referencing nonexistent columns
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
  v_product_uuid uuid;
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

  for v_product_uuid in
    select distinct (item->>'product_id')::uuid
    from jsonb_array_elements(p_items) as item
  loop
    perform public.refresh_product_from_variants(v_product_uuid);
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
