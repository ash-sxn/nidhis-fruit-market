-- Storage policies so admin users can manage product imagery via the browser
drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admins insert product images" on storage.objects;
drop policy if exists "Admins update product images" on storage.objects;
drop policy if exists "Admins delete product images" on storage.objects;

create policy "Public read product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "Admins insert product images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'product-images' and
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

create policy "Admins update product images"
  on storage.objects
  for update
  using (
    bucket_id = 'product-images' and
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  )
  with check (
    bucket_id = 'product-images'
  );

create policy "Admins delete product images"
  on storage.objects
  for delete
  using (
    bucket_id = 'product-images' and
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );
