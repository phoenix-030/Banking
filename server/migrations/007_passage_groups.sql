CREATE TABLE IF NOT EXISTS passage_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  passage_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_passage_groups_section ON passage_groups(section_id, title);
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_passage_group_id_fkey;
ALTER TABLE questions ADD CONSTRAINT questions_passage_group_id_fkey FOREIGN KEY (passage_group_id) REFERENCES passage_groups(id) ON DELETE SET NULL;
