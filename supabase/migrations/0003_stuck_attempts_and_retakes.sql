-- Stuck attempts resolution tracking and retake approvals

-- Track how a stuck attempt was resolved: null = unresolved, 'finalized', 'retake_granted'
alter table attempts add column if not exists stuck_resolution text;

-- Retake approvals: allows a student to retake an exam after admin approval
create table if not exists retake_approvals (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  approved_by uuid references users(id),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists retake_approvals_test_student_idx on retake_approvals (test_id, student_id);
