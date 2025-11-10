begin;

grant usage on schema public to anon, authenticated;
grant select on table public.product_variants to anon;
grant select, insert, update, delete on table public.product_variants to authenticated;

drop policy if exists "Read active variants" on public.product_variants;
create policy "Variants available to shoppers"
  on public.product_variants
  for select
  using (
    (
      is_active = true
      and exists (
        select 1 from public.products p
        where p.id = product_id
          and coalesce(p.is_active, true) = true
      )
    )
    or auth.role() = 'service_role'
    or public.is_admin(auth.uid())
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
