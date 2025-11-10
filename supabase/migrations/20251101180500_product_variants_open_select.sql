begin;

drop policy if exists "Variants available to shoppers" on public.product_variants;
drop policy if exists "Variants readable by all" on public.product_variants;
drop policy if exists "Variants admin manage" on public.product_variants;

create policy "Variants readable by anyone"
  on public.product_variants
  for select
  using (true);

create policy "Variants manageable by admins"
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
