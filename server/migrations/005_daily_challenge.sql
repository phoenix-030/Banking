CREATE TABLE IF NOT EXISTS daily_challenge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, challenge_date)
);

CREATE TABLE IF NOT EXISTS daily_challenge_questions (
  session_id UUID NOT NULL REFERENCES daily_challenge_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_snapshot JSONB NOT NULL,
  sort_order INTEGER NOT NULL,
  selected_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  PRIMARY KEY (session_id, question_id),
  UNIQUE (session_id, sort_order)
);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_student_date ON daily_challenge_sessions(student_id, challenge_date DESC);
