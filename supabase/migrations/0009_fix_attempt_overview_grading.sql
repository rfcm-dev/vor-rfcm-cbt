-- Fix attempt_overview view to include percentage and grade computed from raw total_score
-- Drop first because PostgreSQL CREATE OR REPLACE VIEW cannot remove columns.
DROP VIEW IF EXISTS attempt_overview;

CREATE VIEW attempt_overview AS
SELECT
  a.id AS attempt_id,
  a.test_id,
  a.student_id,
  t.title AS test_title,
  s.name AS student_name,
  c.id AS class_id,
  c.name AS class_name,
  a.status AS attempt_status,
  r.status AS result_status,
  r.total_score,
  r.released_at,
  a.started_at,
  a.submitted_at,
  COALESCE(
    ROUND(
      (r.total_score::numeric / NULLIF(
        (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.test_id = a.test_id),
        0
      )) * 100
    ),
    0
  ) AS percentage,
  CASE
    WHEN COALESCE(
      ROUND(
        (r.total_score::numeric / NULLIF(
          (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.test_id = a.test_id),
          0
        )) * 100
      ),
      0
    ) >= 80 THEN 'A'
    WHEN COALESCE(
      ROUND(
        (r.total_score::numeric / NULLIF(
          (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.test_id = a.test_id),
          0
        )) * 100
      ),
      0
    ) >= 70 THEN 'B'
    WHEN COALESCE(
      ROUND(
        (r.total_score::numeric / NULLIF(
          (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.test_id = a.test_id),
          0
        )) * 100
      ),
      0
    ) >= 60 THEN 'C'
    WHEN COALESCE(
      ROUND(
        (r.total_score::numeric / NULLIF(
          (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.test_id = a.test_id),
          0
        )) * 100
      ),
      0
    ) >= 50 THEN 'D'
    ELSE 'F'
  END AS grade,
  COALESCE(EXTRACT(EPOCH FROM (NOW() - a.started_at))::int, 0) AS late_seconds
FROM attempts a
JOIN tests t ON t.id = a.test_id
JOIN students s ON s.id = a.student_id
JOIN classes c ON c.id = s.class_id
LEFT JOIN results r ON r.attempt_id = a.id;
