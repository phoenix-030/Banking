ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN ('mcq','passage','image','numeric','descriptive'));

ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS pending_review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS manual_score NUMERIC(8,3);
ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS grader_comment TEXT NOT NULL DEFAULT '';
ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE section_results ADD COLUMN IF NOT EXISTS pending_review_count INTEGER NOT NULL DEFAULT 0;
