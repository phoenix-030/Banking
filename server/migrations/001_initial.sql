CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_exam_id UUID,
  preparation_status TEXT NOT NULL DEFAULT 'starting',
  profile_picture_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_target_exam_id_fkey;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_target_exam_id_fkey FOREIGN KEY (target_exam_id) REFERENCES exams(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS exam_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (exam_id, name)
);
CREATE TABLE IF NOT EXISTS exam_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES exam_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count >= 0),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  marks_per_correct NUMERIC(8,3) NOT NULL DEFAULT 1 CHECK (marks_per_correct >= 0),
  negative_marks NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (negative_marks >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (stage_id, name)
);
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  UNIQUE (section_id, name)
);
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE RESTRICT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq','passage','image','numeric')),
  language TEXT NOT NULL DEFAULT 'English',
  question_text TEXT NOT NULL,
  passage_group_id UUID,
  image_url TEXT,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  marks NUMERIC(8,3) NOT NULL DEFAULT 1 CHECK (marks >= 0),
  negative_marks NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (negative_marks >= 0),
  source TEXT NOT NULL DEFAULT '',
  source_year INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_questions_section_status ON questions(section_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_topic_difficulty ON questions(topic_name, difficulty);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_deduplicate ON questions(section_id, content_hash) WHERE content_hash <> '';
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES exam_stages(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  review_policy TEXT NOT NULL DEFAULT 'after_submit' CHECK (review_policy IN ('after_submit','never')),
  selection_mode TEXT NOT NULL DEFAULT 'manual' CHECK (selection_mode IN ('manual','rule_based')),
  availability_start TIMESTAMPTZ,
  availability_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mock_test_questions (
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mock_test_id, question_id)
);
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','auto_submitted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  section_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_section_id UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
  section_ends_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score NUMERIC(10,3),
  max_score NUMERIC(10,3),
  correct_count INTEGER,
  wrong_count INTEGER,
  unanswered_count INTEGER,
  elapsed_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempt_student_created ON test_attempts(student_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_attempt_per_student ON test_attempts(student_id) WHERE status='in_progress';
CREATE TABLE IF NOT EXISTS student_answers (
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_answer TEXT,
  marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  visited BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS section_results (
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE RESTRICT,
  question_count INTEGER NOT NULL,
  attempted_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  score NUMERIC(10,3) NOT NULL,
  accuracy NUMERIC(6,3) NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, section_id)
);
CREATE TABLE IF NOT EXISTS bookmarks (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, question_id)
);
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE RESTRICT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS practice_answers (
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_answer TEXT,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ,
  PRIMARY KEY (session_id, question_id)
);
CREATE TABLE IF NOT EXISTS current_affairs_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS current_affairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES current_affairs_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS current_affairs_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affair_id UUID NOT NULL REFERENCES current_affairs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS current_affairs_answers (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES current_affairs_questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,question_id)
);
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS student_achievements (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS leaderboard_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  score NUMERIC(10,3) NOT NULL,
  period_start DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly','monthly','overall')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, period_type)
);
CREATE TABLE IF NOT EXISTS student_streaks (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_days INTEGER NOT NULL DEFAULT 0,
  best_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('validated','confirmed','rejected')),
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL,
  invalid_rows INTEGER NOT NULL,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  staged_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS upload_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  row_data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
INSERT INTO current_affairs_categories(name) VALUES
 ('Banking Awareness'),('RBI Updates'),('Economy'),('National'),('International'),
 ('Government Schemes'),('Appointments'),('Awards'),('Sports')
ON CONFLICT (name) DO NOTHING;
INSERT INTO achievements(code,name,description) VALUES
 ('first_mock','First Mock Test','Complete your first mock examination.'),
 ('hundred_questions','100 Questions Completed','Answer 100 practice or mock questions.'),
 ('seven_day_streak','7-Day Streak','Study on seven consecutive days.'),
 ('ninety_accuracy','90% Accuracy','Achieve at least 90% accuracy in an eligible attempt.'),
 ('top_ten','Top 10 Ranking','Place in the top ten of an eligible leaderboard period.')
ON CONFLICT (code) DO NOTHING;
INSERT INTO exams(code,name,description,status) VALUES
 ('IBPS-RRB-OA','IBPS RRB Office Assistant (Multipurpose)','Exam pattern needs review against the current official notification.','draft'),
 ('IBPS-RRB-PO','IBPS RRB Officer Scale I','Exam pattern needs review against the current official notification.','draft'),
 ('IBPS-PO','IBPS PO','Exam pattern needs review against the current official notification.','draft'),
 ('IBPS-CSA','IBPS Clerk / Customer Service Associate','Exam pattern needs review against the current official notification.','draft'),
 ('SBI-PO','SBI PO','Exam pattern needs review against the current official notification.','draft'),
 ('SBI-JA','SBI Clerk / Junior Associate','Exam pattern needs review against the current official notification.','draft'),
 ('RBI-ASSISTANT','RBI Assistant','Exam pattern needs review against the current official notification.','draft'),
 ('RBI-GRADE-B','RBI Grade B','Exam pattern needs review against the current official notification.','draft'),
 ('NABARD','NABARD examinations','Exam pattern needs review against the current official notification.','draft')
ON CONFLICT(code) DO NOTHING;
INSERT INTO exam_stages(exam_id,name,duration_seconds,sort_order)
SELECT id,'Pattern pending verification',3600,0 FROM exams WHERE code IN('IBPS-RRB-OA','IBPS-RRB-PO','IBPS-PO','IBPS-CSA','SBI-PO','SBI-JA','RBI-ASSISTANT','RBI-GRADE-B','NABARD')
ON CONFLICT(exam_id,name) DO NOTHING;
INSERT INTO exam_sections(stage_id,name,question_count,duration_seconds,marks_per_correct,negative_marks,sort_order)
SELECT id,'Pattern pending verification',0,NULL,1,0,0 FROM exam_stages WHERE name='Pattern pending verification'
ON CONFLICT(stage_id,name) DO NOTHING;
