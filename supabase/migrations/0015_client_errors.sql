create table if not exists client_errors (
  id uuid primary key default gen_random_uuid(),
  message text,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);
