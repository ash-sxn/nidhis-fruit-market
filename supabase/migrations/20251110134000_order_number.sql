create sequence if not exists public.order_number_seq;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  next_id bigint;
begin
  select nextval('public.order_number_seq') into next_id;
  return 'NDF' || lpad(next_id::text, 6, '0');
end;
$$;

alter table public.orders
  add column if not exists order_number text unique default public.generate_order_number();

select setval('public.order_number_seq', coalesce((
  select max(substring(order_number from '\\d+$')::bigint)
  from public.orders
  where order_number ~ '\\d+$'
), 1));
