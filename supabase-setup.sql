-- A-BODY — Setup do banco (rodar no SQL Editor do Supabase)

create table if not exists public.user_data (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

create policy "usuarios acessam apenas seus dados"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
