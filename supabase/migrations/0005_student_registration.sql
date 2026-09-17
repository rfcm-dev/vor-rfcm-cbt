-- Part 3: Add student profile fields
-- Run AFTER Part 1's attempt_overview view migration

alter table students add column if not exists photo_url text;
alter table students add column if not exists teacher_name text;
