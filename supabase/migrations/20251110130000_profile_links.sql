create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.profile_links enable row level security;

drop policy if exists "Profile links readable" on public.profile_links;
drop policy if exists "Profile links writable" on public.profile_links;
create policy "Profile links readable" on public.profile_links
  for select using (auth.uid() = user_id);
create policy "Profile links writable" on public.profile_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
