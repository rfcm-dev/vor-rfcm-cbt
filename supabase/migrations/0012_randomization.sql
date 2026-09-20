alter table tests add column if not exists randomize_questions boolean default false;
alter table tests add column if not exists randomize_options boolean default false;
alter table attempts add column if not exists randomization_seed text;
