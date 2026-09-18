CREATE INDEX IF NOT EXISTS idx_tests_status_created_at ON tests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_status_attempt_id ON results (status, attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id_status ON attempts (test_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions (test_id);
