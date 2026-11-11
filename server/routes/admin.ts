
import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse as parseCsv } from 'csv-parse/sync';
import readXlsxFile from 'read-excel-file/node';
import { pool } from '../db';
import { requireAdmin, validate } from '../middleware';
import { examSchema, questionSchema } from '../schemas';
import { selectNonRepeatingQuestions } from '../services/questionSelection';
import {
  MIN_BANK_UPLOAD_QUESTIONS,
  syncStageQuestionBankMockTest,
  type StageSyncResult,
} from '../services/questionBankSync';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

async function syncSectionsStage(
  sectionIds: string[],
  actorId: string | undefined,
  autoPublishExam = false,
): Promise<StageSyncResult[]> {
  const cleanIds = [...new Set(sectionIds.filter(Boolean))];
  if (!cleanIds.length) return [];

  const stageRows = await pool.query(
    'SELECT DISTINCT stage_id FROM exam_sections WHERE id = ANY($1::uuid[])',
    [cleanIds],
  );
  if (!stageRows.rowCount) return [];

  const client = await pool.connect();
  const results: StageSyncResult[] = [];
  try {
    await client.query('BEGIN');
    for (const row of stageRows.rows) {
      const synced = await syncStageQuestionBankMockTest(
        client,
        row.stage_id,
        actorId,
        { autoPublishExam },
      );
      if (synced) results.push(synced);
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function audit(
  actor: string | undefined,
  action: string,
  type: string,
  id: string | null,
  details: object = {},
  ip?: string
) {
  await pool.query(
    `INSERT INTO audit_logs
      (actor_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actor ?? null, action, type, id, JSON.stringify(details), ip ?? null]
  );
}

async function upsertTopic(sectionId: string, name: string) {
  const result = await pool.query(
    `INSERT INTO topics(section_id, name)
     VALUES ($1, $2)
     ON CONFLICT(section_id, name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [sectionId, name]
  );

  return result.rows[0].id as string;
}

async function assertPassageGroup(
  sectionId: string,
  questionType: string,
  passageGroupId: string | null
) {
  if (questionType !== 'passage') return;

  const group = await pool.query(
    'SELECT id FROM passage_groups WHERE id = $1 AND section_id = $2',
    [passageGroupId, sectionId]
  );

  if (!group.rowCount) {
    throw Object.assign(
      new Error('Choose a passage group that belongs to the selected exam section.'),
      { status: 400 }
    );
  }
}

const selectionRuleSchema = z.object({
  sectionId: z.string().uuid(),

  topicDistribution: z.array(
    z.object({
      topicName: z.string().trim().min(1).max(120),
      percent: z.number().int().min(0).max(100)
    })
  )
    .max(100)
    .default([])
    .refine(
      topics => new Set(topics.map(topic => topic.topicName)).size === topics.length,
      { message: 'Topics in a section rule must be unique.' }
    )
    .refine(
      topics => !topics.length || topics.reduce((sum, topic) => sum + topic.percent, 0) === 100,
      { message: 'Topic percentages must total 100.' }
    ),

  easyPercent: z.number().int().min(0).max(100),
  mediumPercent: z.number().int().min(0).max(100),
  hardPercent: z.number().int().min(0).max(100)
}).refine(
  rule => rule.easyPercent + rule.mediumPercent + rule.hardPercent === 100,
  { message: 'Difficulty percentages must total 100.' }
);

const mockTestDraftSchema = z.object({
  examId: z.string().uuid(),
  stageId: z.string().uuid(),
  name: z.string().trim().min(3).max(180),
  description: z.string().max(4000).default(''),
  durationSeconds: z.number().int().positive().max(86400),
  reviewPolicy: z.enum(['after_submit', 'never']).default('after_submit'),
  selectionMode: z.enum(['manual', 'rule_based']).default('manual'),

  questionIds: z.array(z.string().uuid())
    .max(1000)
    .default([])
    .refine(ids => new Set(ids).size === ids.length, {
      message: 'Question IDs must be unique.'
    }),

  selectionRules: z.array(selectionRuleSchema)
    .max(100)
    .default([])
    .refine(rules => new Set(rules.map(rule => rule.sectionId)).size === rules.length, {
      message: 'Each section can have only one selection rule.'
    }),

  availabilityStart: z.string().datetime().nullable().default(null),
  availabilityEnd: z.string().datetime().nullable().default(null),
  status: z.literal('draft').default('draft')
}).superRefine((value, ctx) => {
  if (value.selectionMode === 'manual' && !value.questionIds.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['questionIds'],
      message: 'Select at least one published question.'
    });
  }

  if (value.selectionMode === 'rule_based' && !value.selectionRules.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['selectionRules'],
      message: 'Configure selection rules for the exam sections.'
    });
  }

  if (
    value.availabilityStart &&
    value.availabilityEnd &&
    new Date(value.availabilityEnd) <= new Date(value.availabilityStart)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['availabilityEnd'],
      message: 'Availability end must be later than the start.'
    });
  }
});

async function resolveMockTestQuestions(
  client: any,
  input: any,
  existingTestId?: string
) {
  if (input.selectionMode === 'manual') {
    const selected = await client.query(
      `SELECT q.id, q.section_id
       FROM unnest($1::uuid[]) WITH ORDINALITY wanted(id, position)
       JOIN questions q ON q.id = wanted.id
       JOIN exam_sections s ON s.id = q.section_id
       JOIN exam_stages st ON st.id = s.stage_id
       WHERE st.id = $2 AND q.status = 'published'
       ORDER BY wanted.position`,
      [input.questionIds, input.stageId]
    );

    if (selected.rowCount !== input.questionIds.length) {
      throw Object.assign(
        new Error('Every selected question must be published and belong to this exam stage.'),
        { status: 400 }
      );
    }

    const sections = await client.query(
      'SELECT id, name, question_count FROM exam_sections WHERE stage_id = $1 ORDER BY sort_order, id',
      [input.stageId]
    );

    if (
      !sections.rowCount ||
      sections.rows.some((section: any) => Number(section.question_count) <= 0)
    ) {
      throw Object.assign(
        new Error('Manual selection requires positive question counts in every configured section.'),
        { status: 409 }
      );
    }

    const counts = new Map<string, number>();

    for (const question of selected.rows) {
      counts.set(
        question.section_id,
        (counts.get(question.section_id) ?? 0) + 1
      );
    }

    for (const section of sections.rows) {
      const actual = counts.get(section.id) ?? 0;

      if (actual !== Number(section.question_count)) {
        throw Object.assign(
          new Error(
            `Select exactly ${section.question_count} questions for ${section.name}; ${actual} are selected.`
          ),
          { status: 409 }
        );
      }
    }

    return selected.rows;
  }

  const priorRows = await client.query(
    `SELECT DISTINCT mtq.question_id
     FROM mock_test_questions mtq
     JOIN mock_tests mt ON mt.id = mtq.mock_test_id
     WHERE mt.stage_id = $1
       AND mt.status <> 'archived'
       AND ($2::uuid IS NULL OR mt.id <> $2)`,
    [input.stageId, existingTestId ?? null]
  );

  return selectNonRepeatingQuestions(client, {
    stageId: input.stageId,
    selectionRules: input.selectionRules ?? [],
    preferExcludeIds: priorRows.rows.map((r: any) => r.question_id),
    shuffleWithinSection: true,
  });
}

/* -------------------------------------------------------------------------- */
/* ADMIN OVERVIEW                                                             */
/* -------------------------------------------------------------------------- */

adminRouter.get('/overview', async (_req, res) => {
  const stats = await pool.query(`
    SELECT
      (SELECT count(*) FROM users WHERE role = 'student') students,
      (SELECT count(*) FROM users WHERE role = 'student'
        AND updated_at > now() - interval '30 days') active_students,
      (SELECT count(*) FROM questions) total_questions,
      (SELECT count(*) FROM questions WHERE status = 'published') published_questions,
      (SELECT count(*) FROM mock_tests WHERE status = 'published') published_tests,
      (SELECT count(*) FROM test_attempts WHERE status <> 'in_progress') attempts,
      (SELECT count(*) FROM exams WHERE status = 'published') published_exams,
      (SELECT coalesce(sum(invalid_rows), 0) FROM upload_batches) import_validation_failures
  `);

  const activity = await pool.query(
    'SELECT id, action, entity_type, entity_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 12'
  );

  res.json({
    stats: stats.rows[0],
    activity: activity.rows
  });
});

/* -------------------------------------------------------------------------- */
/* STUDENTS                                                                   */
/* -------------------------------------------------------------------------- */

adminRouter.get('/students', async (req, res) => {
  const search = String(req.query.search ?? '');

  const students = await pool.query(
    `SELECT
       u.id, u.email, u.full_name, u.mobile, u.role, u.is_active, u.created_at,
       p.preparation_status, e.name target_exam
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     LEFT JOIN exams e ON e.id = p.target_exam_id
     WHERE u.role = 'student'
       AND ($1 = '' OR u.email ILIKE $2 OR u.full_name ILIKE $2)
     ORDER BY u.created_at DESC
     LIMIT 200`,
    [search, `%${search}%`]
  );

  res.json({ students: students.rows });
});

adminRouter.patch('/students/:id', async (req, res) => {
  const input = validate(
    z.object({
      role: z.enum(['student', 'admin']).optional(),
      isActive: z.boolean().optional()
    }),
    req.body
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE users
       SET role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           updated_at = now()
       WHERE id = $1
       RETURNING id, email, full_name, role, is_active`,
      [req.params.id, input.role ?? null, input.isActive ?? null]
    );

    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found.' });
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'student.update', 'user', $2, $3, $4)`,
      [req.session.userId, req.params.id, JSON.stringify(input), req.ip]
    );

    await client.query('COMMIT');

    res.json({ user: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/* -------------------------------------------------------------------------- */
/* EXAMS                                                                      */
/* -------------------------------------------------------------------------- */

adminRouter.post('/exams', async (req, res) => {
  const input = validate(examSchema, req.body);

  if (input.status !== 'draft') {
    return res.status(400).json({
      error: 'Create examinations as drafts, then verify and publish their patterns from Exam setup.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const exam = (
      await client.query(
        `INSERT INTO exams
          (code, name, category, description, status, pattern_cycle, pattern_source_url, created_by)
         VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7)
         RETURNING id, code, name, category, sort_order, description, status,
                   pattern_cycle, pattern_source_url, pattern_verified_at`,
        [
          input.code.toUpperCase(),
          input.name,
          input.category,
          input.description,
          input.patternCycle,
          input.patternSourceUrl,
          req.session.userId
        ]
      )
    ).rows[0];

    for (const [stageIndex, stage] of input.stages.entries()) {
      const stageRow = (
        await client.query(
          `INSERT INTO exam_stages
            (exam_id, name, duration_seconds, sort_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            exam.id,
            stage.name,
            stage.durationSeconds,
            stage.sortOrder ?? stageIndex
          ]
        )
      ).rows[0];

      for (const [sectionIndex, section] of stage.sections.entries()) {
        await client.query(
          `INSERT INTO exam_sections
            (stage_id, name, question_count, duration_seconds,
             marks_per_correct, negative_marks, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            stageRow.id,
            section.name,
            section.questionCount,
            section.durationSeconds,
            section.marksPerCorrect,
            section.negativeMarks,
            section.sortOrder ?? sectionIndex
          ]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, 'exam.create', 'exam', $2, $3)`,
      [req.session.userId, exam.id, req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({ exam });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.put('/exams/:id', async (req, res) => {
  const input = validate(examSchema, req.body);
  const client = await pool.connect();

  try {
    if (input.status === 'published') {
      if (!input.patternCycle || !input.patternSourceUrl) {
        return res.status(409).json({
          error: 'Add the official pattern cycle and an HTTPS link to its recruitment notification before publishing.'
        });
      }

      const placeholder = input.stages.some(stage =>
        stage.name.toLowerCase().includes('pending verification') ||
        stage.sections.some(section =>
          section.name.toLowerCase().includes('pending verification') ||
          section.questionCount <= 0
        )
      );

      if (placeholder) {
        return res.status(409).json({
          error: 'Replace placeholder stages and sections with a verified exam pattern and positive question counts before publishing.'
        });
      }

      const invalidTimers = input.stages.some(stage => {
        const timed = stage.sections.some(
          section => section.durationSeconds !== null
        );

        return timed && (
          stage.sections.some(section => section.durationSeconds === null) ||
          stage.sections.reduce(
            (sum, section) => sum + (section.durationSeconds ?? 0),
            0
          ) !== stage.durationSeconds
        );
      });

      if (invalidTimers) {
        return res.status(409).json({
          error: 'When using sectional timers, each section must have a time and their total must match the stage duration.'
        });
      }
    }

    await client.query('BEGIN');

    // Lock the exam row before checking attempt history or changing its pattern.
    const examLock = await client.query(
      'SELECT id FROM exams WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!examLock.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const hasHistory = await client.query(
      `SELECT 1
       FROM mock_tests t
       JOIN test_attempts ta ON ta.mock_test_id = t.id
       WHERE t.exam_id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (hasHistory.rowCount) {
      const stored = (
        await client.query(
          `SELECT
             st.id stage_id,
             st.name stage_name,
             st.duration_seconds stage_duration,
             st.sort_order stage_sort,
             s.id section_id,
             s.name section_name,
             s.question_count,
             s.duration_seconds section_duration,
             s.marks_per_correct,
             s.negative_marks,
             s.sort_order section_sort
           FROM exam_stages st
           LEFT JOIN exam_sections s ON s.stage_id = st.id
           WHERE st.exam_id = $1
           ORDER BY
             st.sort_order, st.name, st.id,
             s.sort_order, s.name, s.id`,
          [req.params.id]
        )
      ).rows;

      const existingStages = new Map<string, any>();

      for (const row of stored) {
        let stage = existingStages.get(row.stage_id);

        if (!stage) {
          stage = {
            id: row.stage_id,
            name: row.stage_name,
            durationSeconds: Number(row.stage_duration),
            sortOrder: Number(row.stage_sort),
            sections: []
          };

          existingStages.set(row.stage_id, stage);
        }

        if (row.section_id) {
          stage.sections.push({
            name: row.section_name,
            questionCount: Number(row.question_count),
            durationSeconds:
              row.section_duration === null
                ? null
                : Number(row.section_duration),
            marksPerCorrect: Number(row.marks_per_correct),
            negativeMarks: Number(row.negative_marks),
            sortOrder: Number(row.section_sort)
          });
        }
      }

      // Compare the actual ordered pattern, not the numeric sort-order values.
      // This allows an unchanged pattern to be saved even if the UI sends
      // zero-based array indexes while the database stores different indexes.
      const canonical = (stages: any[]) =>
        stages.map(stage => ({
          name: stage.name,
          durationSeconds: Number(stage.durationSeconds),
          sections: stage.sections.map((section: any) => ({
            name: section.name,
            questionCount: Number(section.questionCount),
            durationSeconds:
              section.durationSeconds === null
                ? null
                : Number(section.durationSeconds),
            marksPerCorrect: Number(section.marksPerCorrect),
            negativeMarks: Number(section.negativeMarks)
          }))
        }));

      const prior = [...existingStages.values()];

      if (
        JSON.stringify(canonical(prior)) !==
        JSON.stringify(canonical(input.stages))
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: 'This examination already has student attempt history, so its stages, sections, timing, question counts, and scoring are locked. Create a new examination cycle to change the pattern.'
        });
      }
    }

    // Metadata and publication details can still be updated.
    const exam = await client.query(
      `UPDATE exams
       SET code = $2,
           name = $3,
           category = $4,
           description = $5,
           status = $6,
           pattern_cycle = $7,
           pattern_source_url = $8,
           pattern_verified_at =
             CASE WHEN $6 = 'published' THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $1
       RETURNING
         id, code, name, category, sort_order, description, status,
         pattern_cycle, pattern_source_url, pattern_verified_at`,
      [
        req.params.id,
        input.code.toUpperCase(),
        input.name,
        input.category,
        input.description,
        input.status,
        input.patternCycle,
        input.patternSourceUrl
      ]
    );

    if (!exam.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exam not found.' });
    }

    // If attempt history exists, do not rewrite or delete any pattern records.
    if (hasHistory.rowCount) {
      await client.query(
        `INSERT INTO audit_logs
          (actor_id, action, entity_type, entity_id, ip_address)
         VALUES ($1, 'exam.update', 'exam', $2, $3)`,
        [req.session.userId, req.params.id, req.ip]
      );

      await client.query('COMMIT');

      return res.json({ exam: exam.rows[0] });
    }

    const seenStages: string[] = [];

    for (const [stageIndex, stage] of input.stages.entries()) {
      let stageRow = stage.id
        ? await client.query(
            'SELECT id FROM exam_stages WHERE id = $1 AND exam_id = $2',
            [stage.id, req.params.id]
          )
        : await client.query(
            'SELECT id FROM exam_stages WHERE exam_id = $1 AND name = $2',
            [req.params.id, stage.name]
          );

      if (stage.id && !stageRow.rowCount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Stage does not belong to this examination.'
        });
      }

      const stageId =
        stageRow.rows[0]?.id ??
        (
          await client.query(
            `INSERT INTO exam_stages
              (exam_id, name, duration_seconds, sort_order)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
              req.params.id,
              stage.name,
              stage.durationSeconds,
              stage.sortOrder ?? stageIndex
            ]
          )
        ).rows[0].id;

      seenStages.push(stageId);

      await client.query(
        `UPDATE exam_stages
         SET name = $2, duration_seconds = $3, sort_order = $4
         WHERE id = $1`,
        [
          stageId,
          stage.name,
          stage.durationSeconds,
          stage.sortOrder ?? stageIndex
        ]
      );

      const seenSections: string[] = [];

      for (const [sectionIndex, section] of stage.sections.entries()) {
        let sectionRow = section.id
          ? await client.query(
              'SELECT id FROM exam_sections WHERE id = $1 AND stage_id = $2',
              [section.id, stageId]
            )
          : await client.query(
              'SELECT id FROM exam_sections WHERE stage_id = $1 AND name = $2',
              [stageId, section.name]
            );

        if (section.id && !sectionRow.rowCount) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Section does not belong to this examination stage.'
          });
        }

        let sectionId = sectionRow.rows[0]?.id;

        if (sectionId) {
          await client.query(
            `UPDATE exam_sections
             SET name = $2,
                 question_count = $3,
                 duration_seconds = $4,
                 marks_per_correct = $5,
                 negative_marks = $6,
                 sort_order = $7
             WHERE id = $1`,
            [
              sectionId,
              section.name,
              section.questionCount,
              section.durationSeconds,
              section.marksPerCorrect,
              section.negativeMarks,
              section.sortOrder ?? sectionIndex
            ]
          );
        } else {
          const created = await client.query(
            `INSERT INTO exam_sections
              (stage_id, name, question_count, duration_seconds,
               marks_per_correct, negative_marks, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              stageId,
              section.name,
              section.questionCount,
              section.durationSeconds,
              section.marksPerCorrect,
              section.negativeMarks,
              section.sortOrder ?? sectionIndex
            ]
          );

          sectionId = created.rows[0].id;
        }

        seenSections.push(sectionId);
      }

      const currentSections = (
        await client.query(
          'SELECT id FROM exam_sections WHERE stage_id = $1',
          [stageId]
        )
      ).rows;

      for (const row of currentSections) {
        if (!seenSections.includes(row.id)) {
          await client.query(
            'DELETE FROM exam_sections WHERE id = $1',
            [row.id]
          );
        }
      }
    }

    const currentStages = (
      await client.query(
        'SELECT id FROM exam_stages WHERE exam_id = $1',
        [req.params.id]
      )
    ).rows;

    for (const row of currentStages) {
      if (!seenStages.includes(row.id)) {
        await client.query(
          'DELETE FROM exam_stages WHERE id = $1',
          [row.id]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, 'exam.update', 'exam', $2, $3)`,
      [req.session.userId, req.params.id, req.ip]
    );

    await client.query('COMMIT');

    res.json({ exam: exam.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.delete('/exams/:id', async (req, res) => {
  const row = await pool.query(
    `UPDATE exams
     SET status = 'archived', updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [req.params.id]
  );

  if (!row.rowCount) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  await audit(
    req.session.userId,
    'exam.archive',
    'exam',
    req.params.id,
    {},
    req.ip
  );

  res.status(204).end();
});

/* -------------------------------------------------------------------------- */
/* PASSAGE GROUPS                                                             */
/* -------------------------------------------------------------------------- */

adminRouter.get('/passage-groups', async (req, res) => {
  const sectionId = req.query.sectionId
    ? z.string().uuid().parse(req.query.sectionId)
    : null;

  const rows = await pool.query(
    `SELECT
       pg.id, pg.section_id, pg.title, pg.passage_text, pg.language,
       pg.image_url, pg.created_at, s.name section_name,
       (SELECT count(*)::int FROM questions q
        WHERE q.passage_group_id = pg.id) question_count
     FROM passage_groups pg
     JOIN exam_sections s ON s.id = pg.section_id
     WHERE ($1::uuid IS NULL OR pg.section_id = $1)
     ORDER BY s.name, pg.title`,
    [sectionId]
  );

  res.json({ passageGroups: rows.rows });
});

adminRouter.post('/passage-groups', async (req, res) => {
  const input = validate(
    z.object({
      sectionId: z.string().uuid(),
      title: z.string().trim().min(2).max(180),
      passageText: z.string().trim().min(20).max(100000),
      language: z.string().trim().min(2).max(32).default('English'),
      imageUrl: z.string().url().max(2000)
        .refine(value => /^https:\/\//i.test(value), {
          message: 'Image URL must use HTTPS.'
        })
        .nullable()
        .default(null)
    }),
    req.body
  );

  const section = await pool.query(
    'SELECT id FROM exam_sections WHERE id = $1',
    [input.sectionId]
  );

  if (!section.rowCount) {
    return res.status(400).json({
      error: 'Choose a valid exam section for this passage.'
    });
  }

  const group = (
    await pool.query(
      `INSERT INTO passage_groups
        (section_id, title, passage_text, language, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.sectionId,
        input.title,
        input.passageText,
        input.language,
        input.imageUrl,
        req.session.userId
      ]
    )
  ).rows[0];

  await audit(
    req.session.userId,
    'passage_group.create',
    'passage_group',
    group.id,
    { sectionId: input.sectionId },
    req.ip
  );

  res.status(201).json({ passageGroup: group });
});

adminRouter.put('/passage-groups/:id', async (req, res) => {
  const input = validate(
    z.object({
      title: z.string().trim().min(2).max(180),
      passageText: z.string().trim().min(20).max(100000),
      language: z.string().trim().min(2).max(32),
      imageUrl: z.string().url().max(2000)
        .refine(value => /^https:\/\//i.test(value), {
          message: 'Image URL must use HTTPS.'
        })
        .nullable()
    }),
    req.body
  );

  const group = await pool.query(
    `UPDATE passage_groups
     SET title = $2, passage_text = $3, language = $4,
         image_url = $5, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      req.params.id,
      input.title,
      input.passageText,
      input.language,
      input.imageUrl
    ]
  );

  if (!group.rowCount) {
    return res.status(404).json({ error: 'Passage group not found.' });
  }

  await audit(
    req.session.userId,
    'passage_group.update',
    'passage_group',
    req.params.id,
    {},
    req.ip
  );

  res.json({ passageGroup: group.rows[0] });
});

/* -------------------------------------------------------------------------- */
/* TOPICS                                                                     */
/* -------------------------------------------------------------------------- */

adminRouter.get('/topics', async (req, res) => {
  const rows = await pool.query(
    `SELECT
       t.id, t.name, t.parent_topic_id,
       s.id section_id, s.name section_name,
       st.id stage_id, e.id exam_id, e.name exam_name
     FROM topics t
     JOIN exam_sections s ON s.id = t.section_id
     JOIN exam_stages st ON st.id = s.stage_id
     JOIN exams e ON e.id = st.exam_id
     WHERE ($1::uuid IS NULL OR s.id = $1)
     ORDER BY e.name, st.sort_order, s.sort_order, t.name`,
    [req.query.sectionId ?? null]
  );

  res.json({ topics: rows.rows });
});

adminRouter.post('/topics', async (req, res) => {
  const input = validate(
    z.object({
      sectionId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      parentTopicId: z.string().uuid().nullable().default(null)
    }),
    req.body
  );

  const row = await pool.query(
    `INSERT INTO topics(section_id, name, parent_topic_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.sectionId, input.name, input.parentTopicId]
  );

  res.status(201).json({ topic: row.rows[0] });
});

/* -------------------------------------------------------------------------- */
/* QUESTIONS                                                                  */
/* -------------------------------------------------------------------------- */

adminRouter.get('/questions', async (req, res) => {
  const rows = await pool.query(
    `SELECT
       q.*, pg.title passage_title, pg.passage_text,
       pg.language passage_language, pg.image_url passage_image_url,
       s.name section_name, e.name exam_name, st.name stage_name
     FROM questions q
     LEFT JOIN passage_groups pg ON pg.id = q.passage_group_id
     JOIN exam_sections s ON s.id = q.section_id
     JOIN exam_stages st ON st.id = s.stage_id
     JOIN exams e ON e.id = st.exam_id
     WHERE ($1::uuid IS NULL OR q.section_id = $1)
       AND ($2::text IS NULL OR q.status = $2)
       AND (
         $3::text IS NULL OR
         q.topic_name ILIKE $3 OR
         q.question_text ILIKE $3 OR
         pg.passage_text ILIKE $3
       )
     ORDER BY q.created_at DESC
     LIMIT 500`,
    [
      req.query.sectionId ?? null,
      req.query.status ?? null,
      req.query.search ? `%${req.query.search}%` : null
    ]
  );

  res.json({ questions: rows.rows });
});

adminRouter.post('/questions', async (req, res) => {
  const question = validate(questionSchema, req.body);

  await assertPassageGroup(
    question.sectionId,
    question.questionType,
    question.passageGroupId
  );

  const topicId = await upsertTopic(
    question.sectionId,
    question.topicName
  );

  const hash = crypto
    .createHash('sha256')
    .update(
      `${question.sectionId}:${question.questionText.trim().toLowerCase()}`
    )
    .digest('hex');

  const saved = await pool.query(
    `INSERT INTO questions
      (section_id, topic_id, topic_name, difficulty, question_type,
       language, question_text, options, correct_answer, explanation,
       marks, negative_marks, source, source_year, status, created_by,
       image_url, passage_group_id, content_hash)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING
       id, status, topic_name, difficulty, question_type,
       image_url, passage_group_id, created_at`,
    [
      question.sectionId,
      topicId,
      question.topicName,
      question.difficulty,
      question.questionType,
      question.language,
      question.questionText,
      JSON.stringify(question.options),
      question.correctAnswer,
      question.explanation,
      question.marks,
      question.negativeMarks,
      question.source,
      question.sourceYear,
      question.status,
      req.session.userId,
      question.imageUrl,
      question.passageGroupId,
      hash
    ]
  );

  await audit(
    req.session.userId,
    `question.${question.status}`,
    'question',
    saved.rows[0].id,
    {
      topic: question.topicName,
      type: question.questionType,
      passageGroupId: question.passageGroupId
    },
    req.ip
  );

  const stageSync = await syncSectionsStage(
    [question.sectionId],
    req.session.userId,
    question.status === 'published',
  );

  res.status(201).json({ question: saved.rows[0], syncedTests: stageSync });
});

adminRouter.put('/questions/:id', async (req, res) => {
  const question = validate(questionSchema, req.body);

  await assertPassageGroup(
    question.sectionId,
    question.questionType,
    question.passageGroupId
  );

  const existingQuestion = await pool.query(
    'SELECT section_id FROM questions WHERE id = $1',
    [req.params.id]
  );

  const topicId = await upsertTopic(
    question.sectionId,
    question.topicName
  );

  const hash = crypto
    .createHash('sha256')
    .update(
      `${question.sectionId}:${question.questionText.trim().toLowerCase()}`
    )
    .digest('hex');

  const saved = await pool.query(
    `UPDATE questions
     SET section_id = $2,
         topic_id = $3,
         topic_name = $4,
         difficulty = $5,
         question_type = $6,
         language = $7,
         question_text = $8,
         options = $9,
         correct_answer = $10,
         explanation = $11,
         marks = $12,
         negative_marks = $13,
         source = $14,
         source_year = $15,
         status = $16,
         image_url = $17,
         passage_group_id = $18,
         content_hash = $19,
         updated_at = now()
     WHERE id = $1
     RETURNING
       id, status, topic_name, difficulty, question_type,
       image_url, passage_group_id, updated_at`,
    [
      req.params.id,
      question.sectionId,
      topicId,
      question.topicName,
      question.difficulty,
      question.questionType,
      question.language,
      question.questionText,
      JSON.stringify(question.options),
      question.correctAnswer,
      question.explanation,
      question.marks,
      question.negativeMarks,
      question.source,
      question.sourceYear,
      question.status,
      question.imageUrl,
      question.passageGroupId,
      hash
    ]
  );

  if (!saved.rowCount) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  await audit(
    req.session.userId,
    'question.update',
    'question',
    req.params.id,
    {
      type: question.questionType,
      passageGroupId: question.passageGroupId
    },
    req.ip
  );

  const stageSync = await syncSectionsStage(
    [existingQuestion.rows[0]?.section_id, question.sectionId],
    req.session.userId,
    question.status === 'published',
  );

  res.json({ question: saved.rows[0], syncedTests: stageSync });
});

adminRouter.patch('/questions/status', async (req, res) => {
  const input = z.object({
    questionIds: z.array(z.string().uuid())
      .min(1)
      .max(500)
      .refine(ids => new Set(ids).size === ids.length, {
        message: 'Question IDs must be unique.'
      }),
    status: z.enum(['draft', 'published', 'archived'])
  }).parse(req.body);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rows = await client.query(
      `SELECT q.id, s.stage_id, e.status exam_status
       FROM questions q
       JOIN exam_sections s ON s.id = q.section_id
       JOIN exam_stages st ON st.id = s.stage_id
       JOIN exams e ON e.id = st.exam_id
       WHERE q.id = ANY($1::uuid[])
       FOR UPDATE OF q, e`,
      [input.questionIds]
    );

    if (rows.rowCount !== input.questionIds.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'One or more selected questions no longer exist.'
      });
    }

    await client.query(
      `UPDATE questions
       SET status = $2, updated_at = now()
       WHERE id = ANY($1::uuid[])`,
      [input.questionIds, input.status]
    );

    const touchedStageIds = [...new Set(rows.rows.map(row => row.stage_id as string))];
    const syncedTests: StageSyncResult[] = [];
    for (const stageId of touchedStageIds) {
      const synced = await syncStageQuestionBankMockTest(
        client,
        stageId,
        req.session.userId,
        { autoPublishExam: input.status === 'published' },
      );
      if (synced) syncedTests.push(synced);
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.session.userId,
        `question.bulk.${input.status}`,
        'question_batch',
        JSON.stringify({
          questionIds: input.questionIds,
          count: input.questionIds.length
        }),
        req.ip
      ]
    );

    await client.query('COMMIT');

    res.json({
      updated: input.questionIds.length,
      status: input.status,
      syncedTests,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.delete('/questions/:id', async (req, res) => {
  const result = await pool.query(
    `UPDATE questions
     SET status = 'archived', updated_at = now()
     WHERE id = $1
     RETURNING id, section_id`,
    [req.params.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  await audit(
    req.session.userId,
    'question.archive',
    'question',
    req.params.id,
    {},
    req.ip
  );

  await syncSectionsStage(
    [result.rows[0].section_id],
    req.session.userId,
    false,
  );

  res.status(204).end();
});

/* -------------------------------------------------------------------------- */
/* QUESTION IMPORT                                                            */
/* -------------------------------------------------------------------------- */

async function decodeRows(data: string, name: string) {
  const buffer = Buffer.from(data, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    throw Object.assign(new Error('Upload limit is 5 MB.'), {
      status: 413
    });
  }

  let list: any[];

  if (/\.csv$/i.test(name)) {
    list = parseCsv(buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
      relax_column_count: true
    });
  } else if (/\.xlsx$/i.test(name)) {
    const sheets = await readXlsxFile(buffer);
    const rows = sheets[0]?.data ?? [];
    const headers = (rows[0] ?? []).map(value => String(value ?? '').trim());

    if (!headers.length) {
      throw Object.assign(new Error('Workbook contains no header row.'), {
        status: 400
      });
    }

    list = rows
      .slice(1)
      .filter(row =>
        row.some(
          cell => cell !== null && cell !== undefined && String(cell).trim()
        )
      )
      .map(row =>
        Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ''])
        )
      );
  } else {
    throw Object.assign(new Error('Upload a .csv or .xlsx file.'), {
      status: 400
    });
  }

  return list.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.trim().toLowerCase(),
        String(value ?? '').trim()
      ])
    )
  );
}

const IMPORT_COLUMNS = [
  'exam_code',
  'stage',
  'section',
  'topic',
  'difficulty',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'language',
  'source'
] as const;

const REQUIRED_IMPORT_COLUMNS = IMPORT_COLUMNS.filter(
  column => column !== 'source'
);

function rowErrors(row: Record<string, string>) {
  const errors: string[] = [];

  for (const key of REQUIRED_IMPORT_COLUMNS) {
    if (!row[key]) {
      errors.push(`Missing ${key}`);
    }
  }

  if (
    row.difficulty &&
    !['easy', 'medium', 'hard'].includes(row.difficulty.toLowerCase())
  ) {
    errors.push('Difficulty must be Easy, Medium, or Hard');
  }

  if (
    row.correct_answer &&
    !['A', 'B', 'C', 'D'].includes(row.correct_answer.toUpperCase())
  ) {
    errors.push('Correct answer must be A, B, C, or D');
  }

  for (const key of ['marks', 'negative_marks']) {
    if (
      row[key] &&
      (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0)
    ) {
      errors.push(`${key} must be non-negative`);
    }
  }

  if (
    row.source_year &&
    (
      !/^\d{4}$/.test(row.source_year) ||
      Number(row.source_year) < 1900 ||
      Number(row.source_year) > 2100
    )
  ) {
    errors.push('Source year must be a year between 1900 and 2100');
  }

  return errors;
}

adminRouter.get('/questions/import/template.csv', (_req, res) => {
  res.type('text/csv')
    .attachment('hhk-question-template.csv')
    .send(`${IMPORT_COLUMNS.join(',')}\n`);
});

adminRouter.post('/questions/import/preview', async (req, res) => {
  const name = String(req.header('x-file-name') ?? 'questions.csv');

  const decoded = await decodeRows(
    String(req.body.data ?? ''),
    name
  );

  if (decoded.length > 5000) {
    return res.status(413).json({
      error: 'Import at most 5,000 rows per batch.'
    });
  }

  const rows = decoded.map((row, index) => ({
    rowNumber: index + 2,
    row,
    errors: rowErrors(row)
  }));

  // Safe defaults are important: missing CSV columns must not crash preview.
  const duplicateMap = new Map<string, number[]>();

  rows.forEach(item => {
    const examCode = (item.row.exam_code ?? '').toLowerCase();
    const stage = (item.row.stage ?? '').toLowerCase();
    const section = (item.row.section ?? '').toLowerCase();
    const question = (item.row.question ?? '').toLowerCase();

    const key = `${examCode}:${stage}:${section}:${question}`;

    duplicateMap.set(key, [
      ...(duplicateMap.get(key) ?? []),
      item.rowNumber
    ]);
  });

  for (const numbers of duplicateMap.values()) {
    if (numbers.length > 1) {
      for (const number of numbers) {
        rows.find(item => item.rowNumber === number)
          ?.errors.push('Duplicate question in upload');
      }
    }
  }

  const codes = [
    ...new Set(
      rows
        .map(item => (item.row.exam_code ?? '').toUpperCase())
        .filter(Boolean)
    )
  ];

  const stages = [
    ...new Set(
      rows
        .map(item => (item.row.stage ?? '').toLowerCase())
        .filter(Boolean)
    )
  ];

  const sections = [
    ...new Set(
      rows
        .map(item => (item.row.section ?? '').toLowerCase())
        .filter(Boolean)
    )
  ];

  const pairs = (
    await pool.query(
      `SELECT
         upper(e.code) code,
         lower(st.name) stage,
         lower(s.name) section,
         lower(q.question_text) question
       FROM questions q
       JOIN exam_sections s ON s.id = q.section_id
       JOIN exam_stages st ON st.id = s.stage_id
       JOIN exams e ON e.id = st.exam_id
       WHERE upper(e.code) = ANY($1::text[])
         AND lower(st.name) = ANY($2::text[])
         AND lower(s.name) = ANY($3::text[])
         AND q.status <> 'archived'`,
      [codes, stages, sections]
    )
  ).rows;

  const existing = new Set(
    pairs.map(row =>
      `${row.code}:${row.stage}:${row.section}:${row.question}`
    )
  );

  const validPairs = (
    await pool.query(
      `SELECT DISTINCT
         upper(e.code) code,
         lower(st.name) stage,
         lower(s.name) section
       FROM exams e
       JOIN exam_stages st ON st.exam_id = e.id
       JOIN exam_sections s ON s.stage_id = st.id
       WHERE upper(e.code) = ANY($1::text[])
         AND lower(st.name) = ANY($2::text[])
         AND lower(s.name) = ANY($3::text[])`,
      [codes, stages, sections]
    )
  ).rows;

  const known = new Set(
    validPairs.map(row => `${row.code}:${row.stage}:${row.section}`)
  );

  for (const item of rows) {
    const examCode = (item.row.exam_code ?? '').toUpperCase();
    const stage = (item.row.stage ?? '').toLowerCase();
    const section = (item.row.section ?? '').toLowerCase();
    const question = (item.row.question ?? '').toLowerCase();

    const pair = `${examCode}:${stage}:${section}`;

    if (
      item.row.exam_code &&
      !known.has(pair)
    ) {
      item.errors.push('Unknown exam, stage, or section combination');
    }

    if (
      item.row.question &&
      existing.has(`${pair}:${question}`)
    ) {
      item.errors.push('Question already exists in the question bank');
    }
  }

  const errors = rows.filter(item => item.errors.length);

  const duplicateCount = rows.filter(item =>
    item.errors.some(error =>
      error.startsWith('Duplicate') ||
      error.includes('already exists')
    )
  ).length;

  const batch = (
    await pool.query(
      `INSERT INTO upload_batches
        (created_by, file_name, status, total_rows, valid_rows,
         invalid_rows, duplicate_rows, staged_rows)
       VALUES ($1, $2, 'validated', $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        req.session.userId,
        name,
        rows.length,
        rows.length - errors.length,
        errors.length,
        duplicateCount,
        JSON.stringify(rows)
      ]
    )
  ).rows[0];

  for (const item of errors) {
    await pool.query(
      `INSERT INTO upload_errors
        (batch_id, row_number, error_message, row_data)
       VALUES ($1, $2, $3, $4)`,
      [
        batch.id,
        item.rowNumber,
        item.errors.join('; '),
        JSON.stringify(item.row)
      ]
    );
  }

  const validCount = rows.length - errors.length;

  res.json({
    batchId: batch.id,
    total: rows.length,
    successful: validCount,
    failed: errors.length,
    duplicate: duplicateCount,
    minimumRequired: MIN_BANK_UPLOAD_QUESTIONS,
    meetsMinimum: validCount >= MIN_BANK_UPLOAD_QUESTIONS,
    errors: errors.map(({ rowNumber, errors }) => ({
      rowNumber,
      errors
    }))
  });
});

adminRouter.post('/questions/import/:batchId/confirm', async (req, res) => {
  const input = z.object({
    rowNumbers: z.array(z.number().int().positive()).min(1)
  }).parse(req.body);

  const client = await pool.connect();
  let imported = 0;

  try {
    await client.query('BEGIN');

    const batch = await client.query(
      `SELECT *
       FROM upload_batches
       WHERE id = $1
         AND created_by = $2
         AND status = 'validated'
       FOR UPDATE`,
      [req.params.batchId, req.session.userId]
    );

    if (!batch.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Validated upload batch not found.'
      });
    }

    const staged = batch.rows[0].staged_rows as {
      rowNumber: number;
      row: Record<string, string>;
      errors: string[];
    }[];

    const rejected = new Set(
      (
        await client.query(
          'SELECT row_number FROM upload_errors WHERE batch_id = $1',
          [req.params.batchId]
        )
      ).rows.map(row => Number(row.row_number))
    );

    const selectedNumbers = [...new Set(input.rowNumbers)];
    const validItems = selectedNumbers
      .map(number => staged.find(row => row.rowNumber === number))
      .filter((item): item is { rowNumber: number; row: Record<string, string>; errors: string[] } =>
        Boolean(item) && !item!.errors.length && !rejected.has(item!.rowNumber)
      );

    if (validItems.length < MIN_BANK_UPLOAD_QUESTIONS) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Minimum ${MIN_BANK_UPLOAD_QUESTIONS} valid questions are required to upload into the question bank (received ${validItems.length}).`
      });
    }

    const touchedStageIds = new Set<string>();

    for (const item of validItems) {
      const row = item.row;

      const section = await client.query(
        `SELECT s.id, st.id stage_id, s.marks_per_correct, s.negative_marks
         FROM exam_sections s
         JOIN exam_stages st ON st.id = s.stage_id
         JOIN exams e ON e.id = st.exam_id
         WHERE upper(e.code) = upper($1)
           AND lower(st.name) = lower($2)
           AND lower(s.name) = lower($3)
         LIMIT 1
         FOR UPDATE OF e, s`,
        [row.exam_code, row.stage, row.section]
      );

      if (!section.rowCount) continue;
      touchedStageIds.add(section.rows[0].stage_id as string);

      const topic = (
        await client.query(
          `INSERT INTO topics(section_id, name)
           VALUES ($1, $2)
           ON CONFLICT(section_id, name)
           DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [section.rows[0].id, row.topic]
        )
      ).rows[0];

      const options = ['A', 'B', 'C', 'D'].map(key => ({
        key,
        text: row[`option_${key.toLowerCase()}`]
      }));

      const hash = crypto
        .createHash('sha256')
        .update(`${section.rows[0].id}:${row.question.toLowerCase()}`)
        .digest('hex');

      const saved = await client.query(
        `INSERT INTO questions
          (section_id, topic_id, topic_name, difficulty, language,
           question_text, options, correct_answer, explanation,
           marks, negative_marks, source, source_year, status,
           created_by, content_hash)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13, 'published', $14, $15)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          section.rows[0].id,
          topic.id,
          row.topic,
          row.difficulty.toLowerCase(),
          row.language,
          row.question,
          JSON.stringify(options),
          row.correct_answer.toUpperCase(),
          row.explanation,
          row.marks
            ? Number(row.marks)
            : Number(section.rows[0].marks_per_correct ?? 1),
          row.negative_marks
            ? Number(row.negative_marks)
            : Number(section.rows[0].negative_marks ?? 0),
          row.source ?? '',
          row.source_year ? Number(row.source_year) : null,
          req.session.userId,
          hash
        ]
      );

      imported += saved.rowCount ?? 0;
    }

    const syncedTests: StageSyncResult[] = [];
    for (const stageId of touchedStageIds) {
      const synced = await syncStageQuestionBankMockTest(
        client,
        stageId,
        req.session.userId,
        { autoPublishExam: true },
      );
      if (synced) syncedTests.push(synced);
    }

    await client.query(
      `UPDATE upload_batches
       SET status = 'confirmed'
       WHERE id = $1`,
      [req.params.batchId]
    );

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'question.import.confirm', 'upload_batch', $2, $3, $4)`,
      [
        req.session.userId,
        req.params.batchId,
        JSON.stringify({ imported, syncedTests }),
        req.ip
      ]
    );

    await client.query('COMMIT');

    res.json({ imported, syncedTests });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

function csvReportCell(value: unknown) {
  let text = String(value ?? '');

  if (/^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

adminRouter.get('/questions/import/:batchId/errors.csv', async (req, res) => {
  const batch = await pool.query(
    'SELECT id FROM upload_batches WHERE id = $1 AND created_by = $2',
    [req.params.batchId, req.session.userId]
  );

  if (!batch.rowCount) {
    return res.status(404).json({ error: 'Upload batch not found.' });
  }

  const rows = await pool.query(
    `SELECT row_number, error_message, row_data
     FROM upload_errors
     WHERE batch_id = $1
     ORDER BY row_number`,
    [req.params.batchId]
  );

  const columns = [...IMPORT_COLUMNS];

  const output = [
    ['row_number', 'errors', ...columns]
      .map(csvReportCell)
      .join(','),

    ...rows.rows.map(row =>
      [
        row.row_number,
        row.error_message,
        ...columns.map(column => row.row_data[column])
      ]
        .map(csvReportCell)
        .join(',')
    )
  ].join('\r\n');

  res.type('text/csv; charset=utf-8')
    .attachment('hhk-question-import-errors.csv')
    .send(`\uFEFF${output}`);
});

/* -------------------------------------------------------------------------- */
/* MOCK TESTS                                                                 */
/* -------------------------------------------------------------------------- */

adminRouter.post('/tests', async (req, res) => {
  const input = validate(mockTestDraftSchema, req.body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stageCheck = await client.query(
      'SELECT id FROM exam_stages WHERE id = $1 AND exam_id = $2',
      [input.stageId, input.examId]
    );

    if (!stageCheck.rowCount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'Stage does not belong to the selected examination.'
      });
    }

    const questions = await resolveMockTestQuestions(client, input);

    const test = (
      await client.query(
        `INSERT INTO mock_tests
          (exam_id, stage_id, name, description, duration_seconds,
           review_policy, selection_mode, selection_rules,
           availability_start, availability_end, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11)
         RETURNING *`,
        [
          input.examId,
          input.stageId,
          input.name,
          input.description,
          input.durationSeconds,
          input.reviewPolicy,
          input.selectionMode,
          JSON.stringify(input.selectionRules),
          input.availabilityStart,
          input.availabilityEnd,
          req.session.userId
        ]
      )
    ).rows[0];

    for (const [index, question] of questions.entries()) {
      await client.query(
        `INSERT INTO mock_test_questions
          (mock_test_id, question_id, section_id, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [test.id, question.id, question.section_id, index]
      );
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'mock_test.create', 'mock_test', $2, $3, $4)`,
      [
        req.session.userId,
        test.id,
        JSON.stringify({ selectionMode: input.selectionMode }),
        req.ip
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({ test });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.get('/tests', async (_req, res) => {
  const tests = await pool.query(
    `SELECT
       t.*, e.name exam_name, st.name stage_name,
       (SELECT count(*) FROM mock_test_questions
        WHERE mock_test_id = t.id)::int question_count,
       ARRAY(
         SELECT question_id
         FROM mock_test_questions
         WHERE mock_test_id = t.id
         ORDER BY sort_order
       ) question_ids
     FROM mock_tests t
     JOIN exams e ON e.id = t.exam_id
     JOIN exam_stages st ON st.id = t.stage_id
     ORDER BY t.created_at DESC`
  );

  res.json({ tests: tests.rows });
});

adminRouter.put('/tests/:id', async (req, res) => {
  const input = validate(mockTestDraftSchema, req.body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      'SELECT status FROM mock_tests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!current.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({ error: 'Mock test not found.' });
    }

    if (current.rows[0].status !== 'draft') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'Only draft mock tests can be edited.'
      });
    }

    const attempts = await client.query(
      'SELECT 1 FROM test_attempts WHERE mock_test_id = $1 LIMIT 1',
      [req.params.id]
    );

    if (attempts.rowCount) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'This test has attempt history and can no longer be edited.'
      });
    }

    const stageCheck = await client.query(
      'SELECT id FROM exam_stages WHERE id = $1 AND exam_id = $2',
      [input.stageId, input.examId]
    );

    if (!stageCheck.rowCount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'Stage does not belong to the selected examination.'
      });
    }

    const questions = await resolveMockTestQuestions(client, input);

    await client.query(
      `UPDATE mock_tests
       SET exam_id = $2,
           stage_id = $3,
           name = $4,
           description = $5,
           duration_seconds = $6,
           review_policy = $7,
           selection_mode = $8,
           selection_rules = $9,
           availability_start = $10,
           availability_end = $11,
           updated_at = now()
       WHERE id = $1`,
      [
        req.params.id,
        input.examId,
        input.stageId,
        input.name,
        input.description,
        input.durationSeconds,
        input.reviewPolicy,
        input.selectionMode,
        JSON.stringify(input.selectionRules),
        input.availabilityStart,
        input.availabilityEnd
      ]
    );

    await client.query(
      'DELETE FROM mock_test_questions WHERE mock_test_id = $1',
      [req.params.id]
    );

    for (const [index, question] of questions.entries()) {
      await client.query(
        `INSERT INTO mock_test_questions
          (mock_test_id, question_id, section_id, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, question.id, question.section_id, index]
      );
    }

    await client.query(
      `INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'mock_test.update', 'mock_test', $2, $3, $4)`,
      [
        req.session.userId,
        req.params.id,
        JSON.stringify({ selectionMode: input.selectionMode }),
        req.ip
      ]
    );

    await client.query('COMMIT');

    res.json({
      test: {
        id: req.params.id,
        status: 'draft'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.patch('/tests/:id/status', async (req, res) => {
  const input = z.object({
    status: z.enum(['draft', 'published', 'archived'])
  }).parse(req.body);

  if (input.status === 'published') {
    const test = await pool.query(
      `SELECT
         t.id, t.exam_id, t.stage_id, t.duration_seconds, t.auto_generated,
         e.status exam_status
       FROM mock_tests t
       JOIN exams e ON e.id = t.exam_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (!test.rowCount) {
      return res.status(404).json({ error: 'Mock test not found.' });
    }

    if (test.rows[0].exam_status !== 'published') {
      return res.status(409).json({
        error: 'Publish the examination after verifying its official pattern before publishing this test.'
      });
    }

    const sections = await pool.query(
      `SELECT
         s.name, s.question_count, s.duration_seconds,
         count(mtq.question_id)::int selected,
         count(q.id) FILTER (WHERE q.status = 'published')::int published_selected
       FROM exam_sections s
       LEFT JOIN mock_test_questions mtq
         ON mtq.section_id = s.id
         AND mtq.mock_test_id = $2
       LEFT JOIN questions q ON q.id = mtq.question_id
       WHERE s.stage_id = $1
       GROUP BY s.id
       ORDER BY s.sort_order`,
      [test.rows[0].stage_id, req.params.id]
    );

    const totalPublishedSelected = sections.rows.reduce(
      (sum, section) => sum + Number(section.published_selected),
      0
    );

    if (test.rows[0].auto_generated) {
      if (totalPublishedSelected < MIN_BANK_UPLOAD_QUESTIONS) {
        return res.status(409).json({
          error: `Upload at least ${MIN_BANK_UPLOAD_QUESTIONS} published questions to publish this Question Bank mock test.`
        });
      }
    } else {
      if (
        !sections.rows.length ||
        sections.rows.some(section =>
          Number(section.question_count) <= 0 ||
          Number(section.question_count) !== Number(section.selected) ||
          Number(section.question_count) !== Number(section.published_selected)
        )
      ) {
        return res.status(409).json({
          error: 'Each section must contain its configured number of published questions before this test can be published.'
        });
      }

      const timed = sections.rows.some(
        section => section.duration_seconds !== null
      );

      if (
        timed &&
        (
          sections.rows.some(section => section.duration_seconds === null) ||
          sections.rows.reduce(
            (sum, section) => sum + Number(section.duration_seconds),
            0
          ) !== Number(test.rows[0].duration_seconds)
        )
      ) {
        return res.status(409).json({
          error: 'Configure a timer for every section and make their total match the mock test duration.'
        });
      }
    }
  }

  const result = await pool.query(
    'UPDATE mock_tests SET status = $2 WHERE id = $1 RETURNING id, status',
    [req.params.id, input.status]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Mock test not found.' });
  }

  await audit(
    req.session.userId,
    `mock_test.${input.status}`,
    'mock_test',
    req.params.id,
    {},
    req.ip
  );

  res.json({ test: result.rows[0] });
});

/* -------------------------------------------------------------------------- */
/* CURRENT AFFAIRS                                                            */
/* -------------------------------------------------------------------------- */

adminRouter.get('/current-affairs', async (_req, res) => {
  const categories = await pool.query(
    'SELECT id, name FROM current_affairs_categories ORDER BY name'
  );

  const items = await pool.query(
    `SELECT
       ca.*, cat.name category
     FROM current_affairs ca
     JOIN current_affairs_categories cat ON cat.id = ca.category_id
     ORDER BY ca.created_at DESC
     LIMIT 300`
  );

  res.json({
    categories: categories.rows,
    items: items.rows
  });
});

adminRouter.post('/current-affairs', async (req, res) => {
  const input = z.object({
    categoryId: z.string().uuid(),
    title: z.string().trim().min(4).max(240),
    body: z.string().trim().min(10).max(30000),
    status: z.enum(['draft', 'published']).default('draft'),
    publishedAt: z.string().datetime().nullable().default(null)
  }).parse(req.body);

  const row = await pool.query(
    `INSERT INTO current_affairs
      (category_id, title, body, status, published_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.categoryId,
      input.title,
      input.body,
      input.status,
      input.publishedAt ??
        (input.status === 'published' ? new Date() : null),
      req.session.userId
    ]
  );

  await audit(
    req.session.userId,
    'current_affairs.create',
    'current_affairs',
    row.rows[0].id,
    { status: input.status },
    req.ip
  );

  res.status(201).json({ item: row.rows[0] });
});

adminRouter.put('/current-affairs/:id', async (req, res) => {
  const input = z.object({
    categoryId: z.string().uuid(),
    title: z.string().trim().min(4).max(240),
    body: z.string().trim().min(10).max(30000),
    status: z.enum(['draft', 'published', 'archived']),
    publishedAt: z.string().datetime().nullable().default(null)
  }).parse(req.body);

  const row = await pool.query(
    `UPDATE current_affairs
     SET category_id = $2,
         title = $3,
         body = $4,
         status = $5,
         published_at = $6
     WHERE id = $1
     RETURNING *`,
    [
      req.params.id,
      input.categoryId,
      input.title,
      input.body,
      input.status,
      input.publishedAt ??
        (input.status === 'published' ? new Date() : null)
    ]
  );

  if (!row.rowCount) {
    return res.status(404).json({
      error: 'Current affairs item not found.'
    });
  }

  await audit(
    req.session.userId,
    'current_affairs.update',
    'current_affairs',
    req.params.id,
    { status: input.status },
    req.ip
  );

  res.json({ item: row.rows[0] });
});

adminRouter.post('/current-affairs/:id/questions', async (req, res) => {
  const input = z.object({
    questionText: z.string().trim().min(5).max(5000),

    options: z.array(
      z.object({
        key: z.string().trim().toUpperCase().regex(/^[A-H]$/),
        text: z.string().trim().min(1).max(1000)
      })
    )
      .min(2)
      .max(8)
      .refine(
        options => new Set(options.map(option => option.key)).size === options.length,
        { message: 'Option keys must be unique.' }
      ),

    correctAnswer: z.string().trim().toUpperCase().regex(/^[A-H]$/),
    explanation: z.string().max(10000).default('')
  }).refine(
    value => value.options.some(option => option.key === value.correctAnswer)
  ).parse(req.body);

  const row = await pool.query(
    `INSERT INTO current_affairs_questions
      (affair_id, question_text, options, correct_answer, explanation)
     SELECT id, $2, $3, $4, $5
     FROM current_affairs
     WHERE id = $1
     RETURNING id, affair_id, question_text, options`,
    [
      req.params.id,
      input.questionText,
      JSON.stringify(input.options),
      input.correctAnswer,
      input.explanation
    ]
  );

  if (!row.rowCount) {
    return res.status(404).json({
      error: 'Current affairs item not found.'
    });
  }

  res.status(201).json({ question: row.rows[0] });
});

/* -------------------------------------------------------------------------- */
/* DESCRIPTIVE ANSWERS                                                        */
/* -------------------------------------------------------------------------- */

adminRouter.get('/descriptive-responses', async (_req, res) => {
  const rows = await pool.query(`
    SELECT
      'mock' response_type,
      ta.id attempt_id,
      NULL::uuid practice_session_id,
      sa.question_id,
      sa.selected_answer response,
      sa.question_snapshot->>'question_text' question_text,
      sa.question_snapshot->>'explanation' grading_rubric,
      (sa.question_snapshot->>'marks')::numeric max_marks,
      sa.time_spent_seconds,
      u.full_name student_name,
      u.email,
      t.name test_name,
      e.name exam_name,
      ta.submitted_at
    FROM student_answers sa
    JOIN test_attempts ta ON ta.id = sa.attempt_id
    JOIN users u ON u.id = ta.student_id
    JOIN mock_tests t ON t.id = ta.mock_test_id
    JOIN exams e ON e.id = t.exam_id
    WHERE ta.status <> 'in_progress'
      AND sa.question_snapshot->>'question_type' = 'descriptive'
      AND sa.selected_answer IS NOT NULL
      AND sa.manual_score IS NULL
      AND t.status = 'published'

    UNION ALL

    SELECT
      'practice',
      NULL::uuid,
      ps.id,
      pa.question_id,
      pa.selected_answer,
      q.question_text,
      q.explanation,
      q.marks,
      pa.time_spent_seconds,
      u.full_name,
      u.email,
      'Topic practice',
      e.name,
      pa.answered_at
    FROM practice_answers pa
    JOIN practice_sessions ps ON ps.id = pa.session_id
    JOIN users u ON u.id = ps.student_id
    JOIN questions q ON q.id = pa.question_id
    JOIN exam_sections s ON s.id = q.section_id
    JOIN exam_stages st ON st.id = s.stage_id
    JOIN exams e ON e.id = st.exam_id
    WHERE q.question_type = 'descriptive'
      AND pa.selected_answer IS NOT NULL
      AND pa.manual_score IS NULL
      AND q.status = 'published'
      AND e.status = 'published'

    ORDER BY submitted_at, student_name
    LIMIT 500
  `);

  res.json({ responses: rows.rows });
});

adminRouter.put(
  '/practice-sessions/:sessionId/answers/:questionId/grade',
  async (req, res) => {
    const input = z.object({
      score: z.number().nonnegative().max(100),
      comment: z.string().trim().max(5000).default('')
    }).parse(req.body);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const row = await client.query(
        `SELECT q.marks, pa.selected_answer
         FROM practice_answers pa
         JOIN practice_sessions ps ON ps.id = pa.session_id
         JOIN questions q ON q.id = pa.question_id
         WHERE ps.id = $1
           AND pa.question_id = $2
           AND q.question_type = 'descriptive'
           AND pa.selected_answer IS NOT NULL
         FOR UPDATE OF pa`,
        [req.params.sessionId, req.params.questionId]
      );

      if (!row.rowCount) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: 'Submitted descriptive practice response not found.'
        });
      }

      if (input.score > Number(row.rows[0].marks)) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: `Score cannot exceed ${row.rows[0].marks}.`
        });
      }

      await client.query(
        `UPDATE practice_answers
         SET manual_score = $3,
             grader_comment = $4,
             graded_by = $5,
             graded_at = now()
         WHERE session_id = $1 AND question_id = $2`,
        [
          req.params.sessionId,
          req.params.questionId,
          input.score,
          input.comment,
          req.session.userId
        ]
      );

      await client.query(
        `INSERT INTO audit_logs
          (actor_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'practice.descriptive.grade',
                 'practice_answer', $2, $3, $4)`,
        [
          req.session.userId,
          req.params.questionId,
          JSON.stringify({
            sessionId: req.params.sessionId,
            score: input.score
          }),
          req.ip
        ]
      );

      await client.query('COMMIT');

      res.json({
        graded: true,
        score: input.score
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

adminRouter.put(
  '/attempts/:attemptId/answers/:questionId/grade',
  async (req, res) => {
    const input = z.object({
      score: z.number().nonnegative().max(100),
      comment: z.string().trim().max(5000).default('')
    }).parse(req.body);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const answer = await client.query(
        `SELECT sa.question_snapshot, sa.selected_answer
         FROM student_answers sa
         JOIN test_attempts ta ON ta.id = sa.attempt_id
         WHERE sa.attempt_id = $1
           AND sa.question_id = $2
           AND ta.status <> 'in_progress'
         FOR UPDATE OF sa`,
        [req.params.attemptId, req.params.questionId]
      );

      if (!answer.rowCount) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: 'Submitted answer not found.'
        });
      }

      const snapshot = answer.rows[0].question_snapshot;

      if (
        snapshot.question_type !== 'descriptive' ||
        !answer.rows[0].selected_answer
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: 'This descriptive answer is not eligible for grading.'
        });
      }

      const maximum = Number(snapshot.marks);

      if (input.score > maximum) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: `Score cannot exceed ${maximum}.`
        });
      }

      await client.query(
        `UPDATE student_answers
         SET manual_score = $3,
             grader_comment = $4,
             graded_by = $5,
             graded_at = now()
         WHERE attempt_id = $1 AND question_id = $2`,
        [
          req.params.attemptId,
          req.params.questionId,
          input.score,
          input.comment,
          req.session.userId
        ]
      );

      const answers = (
        await client.query(
          `SELECT
             sa.selected_answer,
             sa.manual_score,
             sa.question_snapshot->>'question_type' question_type,
             sa.question_snapshot->>'correct_answer' correct_answer,
             sa.question_snapshot->>'section_id' section_id,
             (sa.question_snapshot->>'marks')::numeric marks,
             (sa.question_snapshot->>'negative_marks')::numeric penalty,
             sa.time_spent_seconds
           FROM student_answers sa
           WHERE sa.attempt_id = $1`,
          [req.params.attemptId]
        )
      ).rows;

      let score = 0;
      let maxScore = 0;
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      let pending = 0;

      const sections = new Map<string, any>();

      for (const row of answers) {
        const marks = Number(row.marks);
        const penalty = Number(row.penalty);

        maxScore += marks;

        const section = sections.get(row.section_id) ?? {
          count: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          pending: 0,
          score: 0,
          time: 0
        };

        section.count++;
        section.time += Number(row.time_spent_seconds);

        if (!row.selected_answer) {
          unanswered++;
        } else if (row.question_type === 'descriptive') {
          if (row.manual_score === null) {
            pending++;
            section.pending++;
          } else {
            score += Number(row.manual_score);
            section.score += Number(row.manual_score);
            section.attempted++;
          }
        } else if (row.selected_answer === row.correct_answer) {
          correct++;
          section.correct++;
          section.attempted++;
          score += marks;
          section.score += marks;
        } else {
          wrong++;
          section.wrong++;
          section.attempted++;
          score -= penalty;
          section.score -= penalty;
        }

        sections.set(row.section_id, section);
      }

      await client.query(
        `UPDATE test_attempts
         SET score = $2,
             max_score = $3,
             correct_count = $4,
             wrong_count = $5,
             unanswered_count = $6,
             pending_review_count = $7
         WHERE id = $1`,
        [
          req.params.attemptId,
          score,
          maxScore,
          correct,
          wrong,
          unanswered,
          pending
        ]
      );

      for (const [sectionId, section] of sections) {
        const accuracy =
          section.correct + section.wrong
            ? section.correct / (section.correct + section.wrong) * 100
            : 0;

        await client.query(
          `INSERT INTO section_results
            (attempt_id, section_id, question_count, attempted_count,
             correct_count, wrong_count, pending_review_count,
             score, accuracy, time_spent_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT(attempt_id, section_id)
           DO UPDATE SET
             attempted_count = EXCLUDED.attempted_count,
             correct_count = EXCLUDED.correct_count,
             wrong_count = EXCLUDED.wrong_count,
             pending_review_count = EXCLUDED.pending_review_count,
             score = EXCLUDED.score,
             accuracy = EXCLUDED.accuracy,
             time_spent_seconds = EXCLUDED.time_spent_seconds`,
          [
            req.params.attemptId,
            sectionId,
            section.count,
            section.attempted,
            section.correct,
            section.wrong,
            section.pending,
            section.score,
            accuracy,
            section.time
          ]
        );
      }

      await client.query(
        'UPDATE leaderboard_records SET score = $2 WHERE attempt_id = $1',
        [req.params.attemptId, score]
      );

      await client.query(
        `INSERT INTO audit_logs
          (actor_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'descriptive.grade',
                 'student_answer', $2, $3, $4)`,
        [
          req.session.userId,
          req.params.questionId,
          JSON.stringify({
            attemptId: req.params.attemptId,
            score: input.score
          }),
          req.ip
        ]
      );

      await client.query('COMMIT');

      res.json({
        graded: true,
        score: input.score,
        pendingReviewCount: pending
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------------------------- */
/* REPORTS                                                                    */
/* -------------------------------------------------------------------------- */

adminRouter.get('/reports/attempts', async (req, res) => {
  const from = String(req.query.from ?? '2000-01-01');
  const to = String(req.query.to ?? '2100-01-01');

  const rows = await pool.query(
    `SELECT
       ta.id, ta.started_at, ta.submitted_at, ta.score, ta.max_score,
       ta.correct_count, ta.wrong_count, ta.unanswered_count,
       ta.pending_review_count, ta.elapsed_seconds,
       u.email, u.full_name, t.name test_name, e.name exam_name
     FROM test_attempts ta
     JOIN users u ON u.id = ta.student_id
     JOIN mock_tests t ON t.id = ta.mock_test_id
     JOIN exams e ON e.id = t.exam_id
     WHERE ta.status <> 'in_progress'
       AND ta.submitted_at::date BETWEEN $1::date AND $2::date
     ORDER BY ta.submitted_at DESC
     LIMIT 2000`,
    [from, to]
  );

  res.json({ attempts: rows.rows });
});

adminRouter.get('/audit-logs', async (_req, res) => {
  const rows = await pool.query(
    `SELECT
       a.id, a.action, a.entity_type, a.entity_id,
       a.details, a.ip_address, a.created_at,
       u.email actor_email, u.full_name actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC
     LIMIT 500`
  );

  res.json({ logs: rows.rows });
});
