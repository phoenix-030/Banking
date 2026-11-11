INSERT INTO achievements(code, name, description) VALUES
  ('first_step', 'First Question Answered', 'Answer your first question across practice, daily challenge, current affairs, or mocks.'),
  ('three_day_streak', '3-Day Streak', 'Study on three consecutive days.'),
  ('twenty_five_questions', '25 Questions Completed', 'Answer 25 questions across practice, daily challenges, current affairs, or mocks.')
ON CONFLICT (code) DO NOTHING;

UPDATE achievements
SET description = 'Answer 100 questions across practice, daily challenges, current affairs, or mocks.'
WHERE code = 'hundred_questions' AND description = 'Answer 100 practice or mock questions.';
