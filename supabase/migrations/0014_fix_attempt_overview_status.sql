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
  t.time_limit_minutes,
  COALESCE(
    (SELECT SUM(q.points) FROM questions q WHERE q.test_id = a.test_id),
    0
  ) AS total_possible_points,
  COALESCE(
    (SELECT COUNT(*) FROM questions q WHERE q.test_id = a.test_id AND q.type = 'essay'),
    0
  ) AS essay_total,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM answers ans
      JOIN questions q ON q.id = ans.question_id
      WHERE ans.attempt_id = a.id
        AND q.type = 'essay'
        AND ans.manual_score IS NOT NULL
    ),
    0
  ) AS essays_graded,
  COALESCE(
    GREATEST(
      0,
      EXTRACT(EPOCH FROM (
        COALESCE(a.submitted_at, NOW()) - (a.started_at + (t.time_limit_minutes || ' minutes')::interval)
      ))
    )::int,
    0
  ) AS late_seconds
FROM attempts a
JOIN tests t ON t.id = a.test_id
JOIN students s ON s.id = a.student_id
JOIN classes c ON c.id = s.class_id
LEFT JOIN results r ON r.attempt_id = a.id;

