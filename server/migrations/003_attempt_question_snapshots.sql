ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS question_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE student_answers sa
SET question_snapshot=jsonb_build_object(
  'question_text',q.question_text,
  'options',q.options,
  'topic_name',q.topic_name,
  'difficulty',q.difficulty,
  'correct_answer',q.correct_answer,
  'explanation',q.explanation,
  'marks',COALESCE(s.marks_per_correct,q.marks),
  'negative_marks',COALESCE(s.negative_marks,q.negative_marks),
  'section_id',s.id,
  'section_name',s.name,
  'sort_order',mtq.sort_order
)
FROM test_attempts ta,mock_test_questions mtq,questions q,exam_sections s
WHERE ta.id=sa.attempt_id
  AND mtq.mock_test_id=ta.mock_test_id
  AND mtq.question_id=sa.question_id
  AND q.id=sa.question_id
  AND s.id=mtq.section_id
  AND sa.question_snapshot='{}'::jsonb;
