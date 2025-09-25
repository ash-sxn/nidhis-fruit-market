-- Remove orphaned cart rows before adding foreign keys
delete from public.cart_items ci
where not exists (
  select 1 from public.products p where p.id = ci.product_id
);

delete from public.cart_items ci
where not exists (
  select 1 from auth.users u where u.id = ci.user_id
);

delete from public.wishlists w
where not exists (
  select 1 from public.products p where p.id = w.product_id
);

delete from public.wishlists w
where not exists (
  select 1 from auth.users u where u.id = w.user_id
);

-- Ensure cart_items has no duplicate combinations before adding unique constraint
with duplicates as (
  select ctid
  from (
    select ctid,
           row_number() over (partition by user_id, product_id order by added_at desc) as rn
    from public.cart_items
  ) ranked
  where ranked.rn > 1
)
delete from public.cart_items
where ctid in (select ctid from duplicates);

-- Ensure wishlists has no duplicate combinations before adding unique constraint
with duplicates as (
  select ctid
  from (
    select ctid,
           row_number() over (partition by user_id, product_id order by added_at desc) as rn
    from public.wishlists
  ) ranked
  where ranked.rn > 1
)
delete from public.wishlists
where ctid in (select ctid from duplicates);

-- Helpful indexes for the new constraints
create index if not exists cart_items_user_id_idx on public.cart_items(user_id);
create index if not exists cart_items_product_id_idx on public.cart_items(product_id);
create index if not exists wishlists_user_id_idx on public.wishlists(user_id);
create index if not exists wishlists_product_id_idx on public.wishlists(product_id);

-- Unique constraints to prevent duplicates per user
create unique index if not exists cart_items_user_product_uidx on public.cart_items(user_id, product_id);
create unique index if not exists wishlists_user_product_uidx on public.wishlists(user_id, product_id);

-- Foreign keys for referential integrity (added via DO blocks to avoid duplicate constraint errors)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cart_items_product_id_fkey') then
    alter table public.cart_items
      add constraint cart_items_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cart_items_user_id_fkey') then
    alter table public.cart_items
      add constraint cart_items_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wishlists_product_id_fkey') then
    alter table public.wishlists
      add constraint wishlists_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wishlists_user_id_fkey') then
    alter table public.wishlists
      add constraint wishlists_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;
