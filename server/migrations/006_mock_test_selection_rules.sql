ALTER TABLE mock_tests
  ADD COLUMN IF NOT EXISTS selection_rules JSONB NOT NULL DEFAULT '[]'::jsonb;
