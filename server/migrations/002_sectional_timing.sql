ALTER TABLE test_attempts
  ADD COLUMN IF NOT EXISTS section_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_section_id UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_ends_at TIMESTAMPTZ;
