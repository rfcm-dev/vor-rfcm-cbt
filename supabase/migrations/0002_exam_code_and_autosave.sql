-- Adds the exam-code student flow, an optional student-facing ID, and draft-answer autosave.

alter table tests add column exam_code text unique;
alter table students add column student_code text;
alter table attempts add column draft_answers jsonb not null default '{}'::jsonb;

create index on tests (exam_code);
