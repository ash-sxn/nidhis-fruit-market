-- Ensure product table has storage reference for original file path
alter table public.products
  add column if not exists image_path text;

-- Create audit log table for product changes
create table if not exists public.product_audit_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_audit_logs enable row level security;

drop policy if exists "Admins read product audit logs" on public.product_audit_logs;
create policy "Admins read product audit logs"
  on public.product_audit_logs
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

-- Trigger function to capture inserts and updates
create or replace function public.log_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  payload jsonb;
  claims jsonb;
begin
  begin
    actor := auth.uid();
  exception
    when others then
      actor := null;
  end;

  if actor is null then
    begin
      claims := current_setting('request.jwt.claims', true)::jsonb;
      actor := (claims ->> 'sub')::uuid;
    exception when others then
      actor := null;
    end;
  end if;

  if TG_OP = 'DELETE' then
    payload := jsonb_build_object('old', to_jsonb(old));
  elsif TG_OP = 'INSERT' then
    payload := jsonb_build_object('new', to_jsonb(new));
  else
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  insert into public.product_audit_logs (product_id, user_id, action, changes)
  values (coalesce(new.id, old.id), actor, TG_OP, payload);

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists product_audit on public.products;
create trigger product_audit
after insert or update or delete on public.products
for each row execute procedure public.log_product_change();

-- Storage bucket for product imagery
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
