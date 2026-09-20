alter table questions add column if not exists rubric jsonb;
alter table answers add column if not exists rubric_scores jsonb;
