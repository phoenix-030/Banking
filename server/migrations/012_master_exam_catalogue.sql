ALTER TABLE exams ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other Banks / Institutions';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Remove the generic NABARD placeholder if nothing references it so NABARD splits cleanly into Grade A & Grade B
DELETE FROM exams e
WHERE e.code = 'NABARD'
  AND NOT EXISTS (SELECT 1 FROM mock_tests m WHERE m.exam_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM user_profiles u WHERE u.target_exam_id = e.id)
  AND NOT EXISTS (
    SELECT 1
    FROM exam_stages st
    JOIN exam_sections sec ON sec.stage_id = st.id
    JOIN questions q ON q.section_id = sec.id
    WHERE st.exam_id = e.id
  );

UPDATE exams
SET status = 'archived'
WHERE code = 'NABARD';

INSERT INTO exams(code, name, category, sort_order, description, status) VALUES
  ('IBPS-PO', 'IBPS PO', 'IBPS', 1, 'Probationary Officer / Management Trainee recruitment examination.', 'draft'),
  ('IBPS-CSA', 'IBPS CSA (Clerk)', 'IBPS', 2, 'Customer Service Associate / Clerk recruitment examination.', 'draft'),
  ('IBPS-SO', 'IBPS SO', 'IBPS', 3, 'Specialist Officer recruitment examination.', 'draft'),
  ('IBPS-RRB-PO', 'IBPS RRB PO', 'IBPS', 4, 'Regional Rural Bank Officer Scale I examination.', 'draft'),
  ('IBPS-RRB-SCALE-2', 'IBPS RRB Scale II', 'IBPS', 5, 'Regional Rural Bank Officer Scale II (Generalist & Specialist) examination.', 'draft'),
  ('IBPS-RRB-SCALE-3', 'IBPS RRB Scale III', 'IBPS', 6, 'Regional Rural Bank Officer Scale III examination.', 'draft'),
  ('IBPS-RRB-OA', 'IBPS RRB Office Assistant', 'IBPS', 7, 'Regional Rural Bank Office Assistant (Multipurpose) examination.', 'draft'),
  ('SBI-PO', 'SBI PO', 'SBI', 8, 'State Bank of India Probationary Officer examination.', 'draft'),
  ('SBI-JA', 'SBI Clerk', 'SBI', 9, 'State Bank of India Junior Associate (Customer Support & Sales) examination.', 'draft'),
  ('SBI-SO', 'SBI SO', 'SBI', 10, 'State Bank of India Specialist Cadre Officer examination.', 'draft'),
  ('RBI-GRADE-B', 'RBI Grade B', 'RBI', 11, 'Reserve Bank of India Officers in Grade B examination.', 'draft'),
  ('RBI-ASSISTANT', 'RBI Assistant', 'RBI', 12, 'Reserve Bank of India Assistant recruitment examination.', 'draft'),
  ('NABARD-GRADE-A', 'NABARD Grade A', 'NABARD', 13, 'NABARD Assistant Manager in Grade A examination.', 'draft'),
  ('NABARD-GRADE-B', 'NABARD Grade B', 'NABARD', 14, 'NABARD Manager in Grade B examination.', 'draft'),
  ('IDBI', 'IDBI', 'Other Banks / Institutions', 15, 'IDBI Bank Executive / Assistant Manager recruitment examination.', 'draft'),
  ('SIDBI', 'SIDBI', 'Other Banks / Institutions', 16, 'Small Industries Development Bank of India recruitment examination.', 'draft'),
  ('ECGC', 'ECGC', 'Other Banks / Institutions', 17, 'Export Credit Guarantee Corporation Probationary Officer examination.', 'draft'),
  ('EXIM', 'EXIM', 'Other Banks / Institutions', 18, 'Export-Import Bank of India Management Trainee examination.', 'draft'),
  ('IIFCL', 'IIFCL', 'Other Banks / Institutions', 19, 'India Infrastructure Finance Company Limited recruitment examination.', 'draft')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  description = CASE
    WHEN exams.description = '' OR exams.description LIKE 'Exam pattern needs review%'
    THEN EXCLUDED.description
    ELSE exams.description
  END;

INSERT INTO exam_stages(exam_id, name, duration_seconds, sort_order)
SELECT e.id, 'Pattern pending verification', 3600, 0
FROM exams e
WHERE NOT EXISTS (SELECT 1 FROM exam_stages st WHERE st.exam_id = e.id);

INSERT INTO exam_sections(stage_id, name, question_count, duration_seconds, marks_per_correct, negative_marks, sort_order)
SELECT st.id, 'Pattern pending verification', 0, NULL, 1, 0, 0
FROM exam_stages st
WHERE st.name = 'Pattern pending verification'
  AND NOT EXISTS (SELECT 1 FROM exam_sections s WHERE s.stage_id = st.id);
