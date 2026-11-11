-- Add snapshot columns on practice_answers so Practice sessions can dynamically shuffle option order per attempt
ALTER TABLE practice_answers
  ADD COLUMN IF NOT EXISTS options_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS correct_answer_snapshot TEXT;

-- Seed authentic recruitment stages across all 19 master exams
INSERT INTO exam_stages (exam_id, name, duration_seconds, sort_order)
SELECT e.id, s.stage_name, s.duration_seconds, s.sort_order
FROM exams e
JOIN (VALUES
  ('IBPS-PO', 'Prelims', 3600, 0),
  ('IBPS-PO', 'Mains', 10800, 1),
  ('IBPS-CSA', 'Prelims', 3600, 0),
  ('IBPS-CSA', 'Mains', 10800, 1),
  ('SBI-PO', 'Prelims', 3600, 0),
  ('SBI-PO', 'Mains', 10800, 1),
  ('SBI-JA', 'Prelims', 3600, 0),
  ('SBI-JA', 'Mains', 10800, 1),
  ('RBI-ASSISTANT', 'Prelims', 3600, 0),
  ('RBI-ASSISTANT', 'Mains', 10800, 1),
  ('IBPS-RRB-PO', 'Prelims', 2700, 0),
  ('IBPS-RRB-PO', 'Mains', 7200, 1),
  ('IBPS-RRB-OA', 'Prelims', 2700, 0),
  ('IBPS-RRB-OA', 'Mains', 7200, 1),
  ('IBPS-SO', 'Prelims', 7200, 0),
  ('IBPS-SO', 'Mains', 2700, 1),
  ('SBI-SO', 'Prelims', 7200, 0),
  ('SBI-SO', 'Mains', 2700, 1),
  ('IBPS-RRB-SCALE-2', 'Single Exam', 7200, 0),
  ('IBPS-RRB-SCALE-3', 'Single Exam', 7200, 0),
  ('RBI-GRADE-B', 'Phase I', 7200, 0),
  ('RBI-GRADE-B', 'Phase II', 5400, 1),
  ('NABARD-GRADE-A', 'Phase I', 7200, 0),
  ('NABARD-GRADE-A', 'Phase II', 5400, 1),
  ('NABARD-GRADE-B', 'Phase I', 7200, 0),
  ('NABARD-GRADE-B', 'Phase II', 5400, 1),
  ('SIDBI', 'Phase I', 7200, 0),
  ('SIDBI', 'Phase II', 5400, 1),
  ('IDBI', 'Prelims', 3600, 0),
  ('IDBI', 'Mains', 7200, 1),
  ('ECGC', 'Online Written Exam', 8400, 0),
  ('EXIM', 'Online Written Exam', 8400, 0),
  ('IIFCL', 'Online Written Exam', 8400, 0)
) AS s(exam_code, stage_name, duration_seconds, sort_order)
  ON e.code = s.exam_code
ON CONFLICT (exam_id, name) DO NOTHING;

-- Seed sections for Group A & IDBI Prelims (sectional timers sum to 3600s)
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, sec.dur_sec, sec.marks, sec.neg, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('English Language', 30, 1200, 1.0, 0.25, 0),
  ('Quantitative Aptitude', 35, 1200, 1.0, 0.25, 1),
  ('Reasoning Ability', 35, 1200, 1.0, 0.25, 2)
) AS sec(name, q_count, dur_sec, marks, neg, sort_order) ON TRUE
WHERE st.name = 'Prelims'
  AND e.code IN ('IBPS-PO', 'IBPS-CSA', 'SBI-PO', 'SBI-JA', 'RBI-ASSISTANT', 'IDBI')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed sections for Group A Mains (sectional timers sum to 10800s)
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, sec.dur_sec, sec.marks, sec.neg, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Reasoning & Computer Aptitude', 45, 3600, 1.0, 0.25, 0),
  ('Quantitative Aptitude', 35, 2700, 1.0, 0.25, 1),
  ('English Language', 35, 2400, 1.0, 0.25, 2),
  ('General & Banking Awareness', 40, 2100, 1.0, 0.25, 3)
) AS sec(name, q_count, dur_sec, marks, neg, sort_order) ON TRUE
WHERE st.name = 'Mains'
  AND e.code IN ('IBPS-PO', 'IBPS-CSA', 'SBI-PO', 'SBI-JA', 'RBI-ASSISTANT')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed sections for IBPS RRB PO & OA Prelims (sum 2700s)
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, sec.dur_sec, sec.marks, sec.neg, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Reasoning', 40, 1500, 1.0, 0.25, 0),
  ('Numerical Ability', 40, 1200, 1.0, 0.25, 1)
) AS sec(name, q_count, dur_sec, marks, neg, sort_order) ON TRUE
WHERE st.name = 'Prelims'
  AND e.code IN ('IBPS-RRB-PO', 'IBPS-RRB-OA')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed sections for IBPS RRB Mains & Scale II / III Single Exam
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, NULL::integer, sec.marks, sec.neg, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Reasoning', 40, 1.25, 0.25, 0),
  ('Quantitative Aptitude', 40, 1.25, 0.25, 1),
  ('General Awareness', 40, 1.0, 0.25, 2),
  ('English Language', 40, 1.0, 0.25, 3),
  ('Computer Knowledge', 40, 0.5, 0.125, 4)
) AS sec(name, q_count, marks, neg, sort_order) ON TRUE
WHERE (st.name = 'Mains' AND e.code IN ('IBPS-RRB-PO', 'IBPS-RRB-OA'))
   OR (st.name = 'Single Exam' AND e.code IN ('IBPS-RRB-SCALE-2', 'IBPS-RRB-SCALE-3'))
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed sections for IBPS SO & SBI SO Prelims and Mains
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, sec.dur_sec, sec.marks, sec.neg, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('English Language', 50, 2400, 0.5, 0.125, 0),
  ('Reasoning', 50, 2400, 1.0, 0.25, 1),
  ('Quantitative Aptitude', 50, 2400, 1.0, 0.25, 2)
) AS sec(name, q_count, dur_sec, marks, neg, sort_order) ON TRUE
WHERE st.name = 'Prelims' AND e.code IN ('IBPS-SO', 'SBI-SO')
ON CONFLICT (stage_id, name) DO NOTHING;

INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, 'Professional Knowledge', 60, 2700, 1.0, 0.25, 0
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
WHERE st.name = 'Mains' AND e.code IN ('IBPS-SO', 'SBI-SO')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed sections for RBI Grade B, NABARD Grade A/B, SIDBI Phase I & II
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, NULL::integer, 1.0, 0.25, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('General Awareness', 60, 0),
  ('English Language', 30, 1),
  ('Quantitative Aptitude', 30, 2),
  ('Reasoning Ability', 60, 3)
) AS sec(name, q_count, sort_order) ON TRUE
WHERE st.name = 'Phase I'
  AND e.code IN ('RBI-GRADE-B', 'NABARD-GRADE-A', 'NABARD-GRADE-B', 'SIDBI')
ON CONFLICT (stage_id, name) DO NOTHING;

INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, NULL::integer, 1.0, 0.25, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Economic & Social Issues', 50, 0),
  ('Finance & Management', 50, 1)
) AS sec(name, q_count, sort_order) ON TRUE
WHERE st.name = 'Phase II'
  AND e.code IN ('RBI-GRADE-B', 'NABARD-GRADE-A', 'NABARD-GRADE-B', 'SIDBI')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed IDBI Mains sections
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, NULL::integer, 1.0, 0.25, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Logical Reasoning & Data Interpretation', 60, 0),
  ('English Language', 40, 1),
  ('Quantitative Aptitude', 40, 2),
  ('General & Banking Awareness', 60, 3)
) AS sec(name, q_count, sort_order) ON TRUE
WHERE st.name = 'Mains' AND e.code = 'IDBI'
ON CONFLICT (stage_id, name) DO NOTHING;

-- Seed ECGC, EXIM, IIFCL Online Written Exam sections (sum 8400s)
INSERT INTO exam_sections (stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, sec.name, sec.q_count, sec.dur_sec, 1.0, 0.25, sec.sort_order
FROM exam_stages st
JOIN exams e ON e.id = st.exam_id
JOIN (VALUES
  ('Reasoning Ability', 50, 2400, 0),
  ('English Language', 40, 1800, 1),
  ('Quantitative Aptitude', 50, 2400, 2),
  ('General & Financial Awareness', 40, 1200, 3),
  ('Computer Knowledge', 20, 600, 4)
) AS sec(name, q_count, dur_sec, sort_order) ON TRUE
WHERE st.name = 'Online Written Exam' AND e.code IN ('ECGC', 'EXIM', 'IIFCL')
ON CONFLICT (stage_id, name) DO NOTHING;

-- Safely move any existing questions/topics from 'Pattern pending verification' into the exam's primary stage/section
WITH mapping AS (
  SELECT
    old_sec.id AS old_section_id,
    (
      SELECT new_sec.id
      FROM exam_stages new_st
      JOIN exam_sections new_sec ON new_sec.stage_id = new_st.id
      WHERE new_st.exam_id = old_st.exam_id
        AND new_st.name <> 'Pattern pending verification'
      ORDER BY new_st.sort_order, new_sec.sort_order
      LIMIT 1
    ) AS target_section_id
  FROM exam_stages old_st
  JOIN exam_sections old_sec ON old_sec.stage_id = old_st.id
  WHERE old_st.name = 'Pattern pending verification'
)
UPDATE questions q
SET section_id = m.target_section_id
FROM mapping m
WHERE q.section_id = m.old_section_id
  AND m.target_section_id IS NOT NULL;

DELETE FROM exam_stages st
WHERE st.name = 'Pattern pending verification'
  AND NOT EXISTS (SELECT 1 FROM mock_tests m WHERE m.stage_id = st.id)
  AND NOT EXISTS (
    SELECT 1
    FROM exam_sections s
    JOIN questions q ON q.section_id = s.id
    WHERE s.stage_id = st.id
  );
