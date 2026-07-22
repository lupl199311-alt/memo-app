create table if not exists public.tmemo_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tmemo_states enable row level security;

drop policy if exists "Read own tmemo state" on public.tmemo_states;
drop policy if exists "Insert own tmemo state" on public.tmemo_states;
drop policy if exists "Update own tmemo state" on public.tmemo_states;
drop policy if exists "Delete own tmemo state" on public.tmemo_states;

create policy "Read own tmemo state"
on public.tmemo_states
for select
to authenticated
using (auth.uid() = user_id);

create policy "Insert own tmemo state"
on public.tmemo_states
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Update own tmemo state"
on public.tmemo_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Delete own tmemo state"
on public.tmemo_states
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tmemo_states'
  ) then
    alter publication supabase_realtime add table public.tmemo_states;
  end if;
end $$;
