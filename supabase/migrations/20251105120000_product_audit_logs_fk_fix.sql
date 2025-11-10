-- Allow deleting products while retaining audit history entries
alter table public.product_audit_logs
  drop constraint if exists product_audit_logs_product_id_fkey;
