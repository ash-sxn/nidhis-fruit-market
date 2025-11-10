-- Create search document for products
alter table public.products
  add column if not exists search_document tsvector;

update public.products
set search_document = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''));

create index if not exists products_search_document_idx on public.products using gin (search_document);

create or replace function public.products_search_document_trigger()
returns trigger language plpgsql as $$
begin
  new.search_document := to_tsvector('english', coalesce(new.name, '') || ' ' || coalesce(new.description, ''));
  return new;
end;
$$;

drop trigger if exists products_search_document_tgr on public.products;
create trigger products_search_document_tgr
before insert or update on public.products
for each row execute procedure public.products_search_document_trigger();

-- Function to create order with inventory checks
create or replace function public.create_order_with_items(
  p_currency text,
  p_address jsonb,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_total integer := 0;
  v_currency text := coalesce(p_currency, 'INR');
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_items uuid[] := '{}';
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart empty';
  end if;

  -- Validate stock & calculate total
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::integer, 1);
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found or v_product.is_active is not true then
    raise exception 'Product % unavailable', coalesce(v_product.name, v_item->>'product_id');
    end if;

    if v_qty <= 0 then
      raise exception 'Invalid quantity for %', v_product.name;
    end if;

    if v_product.inventory < v_qty then
      raise exception 'Only % units left for %', v_product.inventory, v_product.name;
    end if;

    v_total := v_total + v_product.price_cents * v_qty;
    v_items := array_append(v_items, v_product.id);
  end loop;

  insert into public.orders (user_id, status, total_cents, currency, address_snapshot)
  values (v_user_id, 'pending', v_total, v_currency, coalesce(p_address, '{}'::jsonb))
  returning id into v_order_id;

  -- Insert order items and decrement inventory
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce(try_cast(v_item->>'quantity' as integer), 1);
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    update public.products
      set inventory = inventory - v_qty
      where id = v_product.id;

    insert into public.order_items (
      order_id,
      product_id,
      name_snapshot,
      price_cents_snapshot,
      quantity
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.price_cents,
      v_qty
    );
  end loop;

  return jsonb_build_object('order_id', v_order_id, 'total_cents', v_total);
end;
$$;

grant execute on function public.create_order_with_items(text, jsonb, jsonb) to authenticated;

-- Function to restock inventory when order is cancelled
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
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
  loop
    update public.products
    set inventory = inventory + v_item.quantity
    where id = v_item.product_id;
  end loop;
end;
$$;

grant execute on function public.restock_order_inventory(uuid) to authenticated;
