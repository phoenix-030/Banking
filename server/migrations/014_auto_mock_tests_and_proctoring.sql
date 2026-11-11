-- Support auto-generated mock tests unlocked when an exam stage reaches 20+ published questions
ALTER TABLE mock_tests
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mock_tests_auto_stage
  ON mock_tests(stage_id)
  WHERE auto_generated = true AND status <> 'archived';
