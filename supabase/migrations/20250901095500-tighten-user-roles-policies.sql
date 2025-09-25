-- Tighten user_roles policies to restrict role assignment
create or replace function public.is_admin(check_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

drop policy if exists "Users can view their own roles" on public.user_roles;
drop policy if exists "Users can add their own roles" on public.user_roles;

drop policy if exists "Service role manages user roles" on public.user_roles;

create policy "Users and admins can view roles"
  on public.user_roles
  for select
  using (
    auth.role() = 'service_role'
    or auth.uid() = user_id
    or public.is_admin(auth.uid())
  );

create policy "Admins manage user roles"
  on public.user_roles
  for all
  using (
    auth.role() = 'service_role'
    or public.is_admin(auth.uid())
  )
  with check (
    auth.role() = 'service_role'
    or public.is_admin(auth.uid())
  );
