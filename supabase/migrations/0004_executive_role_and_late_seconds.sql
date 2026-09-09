-- Part 1: add 'executive' as a valid user role
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check 
  check (role in ('superadmin', 'admin', 'executive', 'teacher'));

-- Part 2: joint question attribution
alter table questions add column if not exists created_by uuid references users(id);

-- Part 4: late-submission audit column
alter table attempts add column if not exists late_seconds integer default 0;
