-- RFCM CBT Software — initial schema

create extension if not exists "pgcrypto";

-- Superadmin / admin / teacher accounts (name + password only, no email)
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  password_hash text not null,
  role text not null check (role in ('superadmin', 'admin', 'teacher')),
  created_at timestamptz not null default now()
);

-- Sunday school classes
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_code text, -- optional, shown to students alongside class name
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Which teacher/admin can manage which class (empty for now, used later)
create table class_assignments (
  user_id uuid references users(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (user_id, class_id)
);

-- Tests / exams
create table tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_id uuid references classes(id) on delete cascade,
  created_by uuid references users(id),
  time_limit_minutes int not null,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now()
);

-- Questions belonging to a test
create table questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  type text not null check (type in ('mcq', 'true_false', 'fill_blank', 'essay')),
  content text not null,
  options jsonb,           -- for mcq: [{id, text}, ...]
  correct_answer text,     -- for mcq/true_false/fill_blank; null for essay
  points numeric not null default 1,
  order_index int not null default 0
);

-- Students are looked up/created ad hoc by class_name + class_code + name — no auth account
create table students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- One exam attempt per student per test
create table attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'auto_submitted'))
);

-- Answers per attempt
create table answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  response text,
  auto_score numeric,      -- filled immediately for mcq/true_false/fill_blank
  manual_score numeric,    -- filled by teacher for essay
  graded_by uuid references users(id),
  graded_at timestamptz
);

-- Final combined result per attempt — gated by release, not by grading completion
create table results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade unique,
  total_score numeric,
  status text not null default 'pending_grading'
    check (status in ('pending_grading', 'graded', 'released')),
  released_at timestamptz,
  released_by uuid references users(id)
);

create index on classes (class_code);
create index on students (class_id, name);
create index on tests (class_id, status);
create index on questions (test_id, order_index);
create index on attempts (test_id, student_id);
create index on answers (attempt_id);

-- Seed the superadmin. Replace the password_hash below with a real bcrypt hash
-- generated at setup time (e.g. via `lib/auth.ts` hashPassword('your-password')) —
-- never commit a plaintext password here.
insert into users (name, password_hash, role)
values ('CIPHER', '<bcrypt-hash-generated-at-setup>', 'superadmin');
