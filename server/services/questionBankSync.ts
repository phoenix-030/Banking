import type { PoolClient } from 'pg';

export const MIN_BANK_UPLOAD_QUESTIONS = 20;

export interface StageSyncResult {
  stageId: string;
  examName: string;
  stageName: string;
  publishedCount: number;
  synced: boolean;
  testId?: string;
  testName?: string;
  questionCount?: number;
}

export async function syncStageQuestionBankMockTest(
  client: PoolClient,
  stageId: string,
  actorId: string | undefined,
  options?: { autoPublishExam?: boolean },
): Promise<StageSyncResult | null> {
  const stageRes = await client.query(
    `SELECT st.id AS stage_id, st.name AS stage_name, st.duration_seconds AS stage_duration,
            e.id AS exam_id, e.name AS exam_name, e.status AS exam_status
     FROM exam_stages st
     JOIN exams e ON e.id = st.exam_id
     WHERE st.id = $1 AND e.status <> 'archived'`,
    [stageId],
  );
  if (!stageRes.rowCount) return null;

  const stage = stageRes.rows[0];
  let examStatus: string = stage.exam_status;

  const [sectionsRes, questionsRes, existingTestRes] = await Promise.all([
    client.query(
      `SELECT id, name, question_count, duration_seconds
       FROM exam_sections
       WHERE stage_id = $1
       ORDER BY sort_order, id`,
      [stageId],
    ),
    client.query(
      `SELECT q.id, q.section_id
       FROM questions q
       JOIN exam_sections s ON s.id = q.section_id
       WHERE s.stage_id = $1
         AND q.status = 'published'
       ORDER BY s.sort_order, q.created_at, q.id`,
      [stageId],
    ),
    client.query(
      `SELECT id, status
       FROM mock_tests
       WHERE stage_id = $1
         AND auto_generated = true
         AND status <> 'archived'
       LIMIT 1
       FOR UPDATE`,
      [stageId],
    ),
  ]);

  const publishedRows = questionsRes.rows as Array<{ id: string; section_id: string }>;
  const publishedCount = publishedRows.length;
  const existing = existingTestRes.rows[0] as { id: string; status: string } | undefined;

  if (publishedCount < MIN_BANK_UPLOAD_QUESTIONS) {
    if (existing) {
      await client.query(
        `UPDATE mock_tests
         SET status = 'draft'
         WHERE id = $1`,
        [existing.id],
      );
      await client.query('DELETE FROM mock_test_questions WHERE mock_test_id = $1', [existing.id]);
      for (const [idx, row] of publishedRows.entries()) {
        await client.query(
          `INSERT INTO mock_test_questions (mock_test_id, question_id, section_id, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [existing.id, row.id, row.section_id, idx],
        );
      }
    }
    return {
      stageId,
      examName: stage.exam_name,
      stageName: stage.stage_name,
      publishedCount,
      synced: false,
    };
  }

  if (options?.autoPublishExam && examStatus === 'draft') {
    await client.query(
      `UPDATE exams
       SET status = 'published', updated_at = now()
       WHERE id = $1 AND status = 'draft'`,
      [stage.exam_id],
    );
    examStatus = 'published';
  }

  const sections = sectionsRes.rows as Array<{
    id: string;
    name: string;
    question_count: number;
    duration_seconds: number | null;
  }>;

  const bySection = new Map<string, Array<{ id: string; section_id: string }>>();
  for (const row of publishedRows) {
    const bucket = bySection.get(row.section_id) ?? [];
    bucket.push(row);
    bySection.set(row.section_id, bucket);
  }

  const fullPatternReady =
    sections.length > 0 &&
    sections.every(
      (sec) =>
        Number(sec.question_count) > 0 &&
        (bySection.get(sec.id)?.length ?? 0) >= Number(sec.question_count),
    );

  const selectedRows = fullPatternReady
    ? sections.flatMap((sec) =>
        (bySection.get(sec.id) ?? []).slice(0, Number(sec.question_count)),
      )
    : publishedRows.slice(0, 100);

  const stageDuration = Math.max(600, Number(stage.stage_duration) || 3600);
  const durationSeconds = fullPatternReady
    ? stageDuration
    : Math.max(1200, Math.min(stageDuration, selectedRows.length * 60));

  const selectionRules = sections.map((sec) => ({
    sectionId: sec.id,
    topicDistribution: [],
    easyPercent: 30,
    mediumPercent: 50,
    hardPercent: 20,
  }));

  const testName = `${stage.exam_name} ${stage.stage_name} - Question Bank Mock Test`;
  const description = fullPatternReady
    ? `Full-pattern dynamic mock test synced from Question Bank (${publishedCount} published questions available). Non-repeating questions and shuffled options every attempt.`
    : `Question Bank dynamic mock test (${selectedRows.length} questions drawn from ${publishedCount} uploaded questions). Non-repeating questions and shuffled options every attempt.`;
  const nextStatus = examStatus === 'published' ? 'published' : 'draft';

  let testId = existing?.id;
  if (!testId) {
    const inserted = await client.query(
      `INSERT INTO mock_tests
         (exam_id, stage_id, name, description, duration_seconds,
          review_policy, selection_mode, selection_rules,
          status, auto_generated, created_by)
       VALUES ($1, $2, $3, $4, $5, 'after_submit', 'rule_based', $6::jsonb, $7, true, $8)
       RETURNING id`,
      [
        stage.exam_id,
        stageId,
        testName,
        description,
        durationSeconds,
        JSON.stringify(selectionRules),
        nextStatus,
        actorId ?? null,
      ],
    );
    testId = inserted.rows[0].id as string;
  } else {
    await client.query(
      `UPDATE mock_tests
       SET name = $2,
           description = $3,
           duration_seconds = $4,
           selection_mode = 'rule_based',
           selection_rules = $5::jsonb,
           status = $6
       WHERE id = $1`,
      [
        testId,
        testName,
        description,
        durationSeconds,
        JSON.stringify(selectionRules),
        nextStatus,
      ],
    );
  }

  await client.query('DELETE FROM mock_test_questions WHERE mock_test_id = $1', [testId]);
  for (const [idx, row] of selectedRows.entries()) {
    await client.query(
      `INSERT INTO mock_test_questions (mock_test_id, question_id, section_id, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [testId, row.id, row.section_id, idx],
    );
  }

  return {
    stageId,
    examName: stage.exam_name,
    stageName: stage.stage_name,
    publishedCount,
    synced: nextStatus === 'published',
    testId,
    testName,
    questionCount: selectedRows.length,
  };
}
