-- Run this in your Supabase project's SQL editor (supabase.com > your project > SQL Editor)

-- 1. Create the state table
create table if not exists life_os_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (CRITICAL — each user only sees their own data)
alter table life_os_state enable row level security;

-- 3. Policy: users can only read/write their own row
create policy "Users manage their own state"
  on life_os_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Allow anon users to call auth functions (already enabled by default)
-- Done! No further setup needed.
