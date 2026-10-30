ALTER TABLE exams ADD COLUMN IF NOT EXISTS pattern_cycle TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS pattern_source_url TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS pattern_verified_at TIMESTAMPTZ;

ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_pattern_source_url_https;
ALTER TABLE exams ADD CONSTRAINT exams_pattern_source_url_https
  CHECK (pattern_source_url IS NULL OR pattern_source_url ~* '^https://');
