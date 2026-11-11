import type { PoolClient } from "pg";
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, validate } from "../middleware";
import {
  getLiveAchievementsSnapshot,
  recordStudyDay,
  syncMilestones,
} from "../services/milestones";
import {
  selectNonRepeatingQuestions,
  shuffleQuestionOptions,
} from "../services/questionSelection";
import { MIN_BANK_UPLOAD_QUESTIONS } from "../services/questionBankSync";

export const attemptRouter = Router();
async function scoreAttempt(
  client: PoolClient,
  id: string,
  status: "submitted" | "auto_submitted",
) {
  const records = await client.query(
    "SELECT ta.student_id,ta.mock_test_id,ta.started_at,sa.question_id,sa.question_snapshot->>'correct_answer' correct_answer,sa.question_snapshot->>'question_type' question_type,sa.manual_score,(sa.question_snapshot->>'marks')::numeric mark,(sa.question_snapshot->>'negative_marks')::numeric penalty,sa.question_snapshot->>'section_id' section_id,sa.selected_answer,sa.time_spent_seconds FROM test_attempts ta JOIN student_answers sa ON sa.attempt_id=ta.id WHERE ta.id=$1",
    [id],
  );
  let score = 0,
    correct = 0,
    wrong = 0,
    unanswered = 0,
    pending = 0,
    maxScore = 0;
  const sections = new Map<
    string,
    {
      count: number;
      attempted: number;
      correct: number;
      wrong: number;
      pending: number;
      score: number;
      time: number;
    }
  >();
  for (const row of records.rows) {
    const mark = Number(row.mark),
      penalty = Number(row.penalty);
    maxScore += mark;
    const s = sections.get(row.section_id) ?? {
      count: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      pending: 0,
      score: 0,
      time: 0,
    };
    s.count++;
    s.time += Number(row.time_spent_seconds);
    if (!row.selected_answer) unanswered++;
    else if (row.question_type === "descriptive") {
      if (row.manual_score === null) {
        pending++;
        s.pending++;
      } else {
        score += Number(row.manual_score);
        s.score += Number(row.manual_score);
        s.attempted++;
      }
    } else if (row.selected_answer === row.correct_answer) {
      correct++;
      s.correct++;
      s.attempted++;
      score += mark;
      s.score += mark;
    } else {
      wrong++;
      s.wrong++;
      s.attempted++;
      score -= penalty;
      s.score -= penalty;
    }
    sections.set(row.section_id, s);
  }
  const elapsed = Math.max(
    0,
    Math.floor(
      (Date.now() -
        new Date(records.rows[0]?.started_at ?? Date.now()).getTime()) /
        1000,
    ),
  );
  const saved = await client.query(
    "UPDATE test_attempts SET status=$2,submitted_at=now(),score=$3,max_score=$4,correct_count=$5,wrong_count=$6,unanswered_count=$7,pending_review_count=$8,elapsed_seconds=$9 WHERE id=$1 RETURNING *",
    [id, status, score, maxScore, correct, wrong, unanswered, pending, elapsed],
  );
  for (const [sectionId, s] of sections)
    await client.query(
      "INSERT INTO section_results(attempt_id,section_id,question_count,attempted_count,correct_count,wrong_count,pending_review_count,score,accuracy,time_spent_seconds) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(attempt_id,section_id) DO UPDATE SET question_count=EXCLUDED.question_count,attempted_count=EXCLUDED.attempted_count,correct_count=EXCLUDED.correct_count,wrong_count=EXCLUDED.wrong_count,pending_review_count=EXCLUDED.pending_review_count,score=EXCLUDED.score,accuracy=EXCLUDED.accuracy,time_spent_seconds=EXCLUDED.time_spent_seconds",
      [
        id,
        sectionId,
        s.count,
        s.attempted,
        s.correct,
        s.wrong,
        s.pending,
        s.score,
        s.correct + s.wrong ? (s.correct / (s.correct + s.wrong)) * 100 : 0,
        s.time,
      ],
    );
  const test = (
    await client.query("SELECT id FROM mock_tests WHERE id=$1", [
      saved.rows[0].mock_test_id,
    ])
  ).rows[0];
  await client.query(
    "INSERT INTO leaderboard_records(student_id,mock_test_id,attempt_id,score,period_start,period_type) VALUES($1,$2,$3,$4,date_trunc('week',now())::date,'weekly'),($1,$2,$3,$4,date_trunc('month',now())::date,'monthly'),($1,$2,$3,$4,'2000-01-01','overall') ON CONFLICT(attempt_id,period_type) DO NOTHING",
    [saved.rows[0].student_id, test.id, id, score],
  );
  const studentId = saved.rows[0].student_id;
  await recordStudyDay(studentId, client);
  await syncMilestones(studentId, client);
  return saved.rows[0];
}
type SectionSlot = {
  section_id: string;
  section_name: string;
  duration_seconds: number;
};
async function advanceAttempt(
  client: PoolClient,
  id: string,
  studentId: string,
) {
  const locked = await client.query(
    "SELECT ta.*,t.name test_name,t.review_policy FROM test_attempts ta JOIN mock_tests t ON t.id=ta.mock_test_id WHERE ta.id=$1 AND ta.student_id=$2 FOR UPDATE OF ta",
    [id, studentId],
  );
  if (!locked.rowCount) return null;
  let attempt = locked.rows[0];
  const now = (await client.query("SELECT now() server_now")).rows[0]
    .server_now as Date;
  if (attempt.status !== "in_progress") return { attempt, serverNow: now };
  if (now.getTime() >= new Date(attempt.ends_at).getTime()) {
    await scoreAttempt(client, id, "auto_submitted");
    attempt = (
      await client.query(
        "SELECT ta.*,t.name test_name,t.review_policy FROM test_attempts ta JOIN mock_tests t ON t.id=ta.mock_test_id WHERE ta.id=$1",
        [id],
      )
    ).rows[0];
    return { attempt, serverNow: now };
  }
  const schedule = (attempt.section_schedule ?? []) as SectionSlot[];
  if (schedule.length) {
    const elapsed = Math.max(
      0,
      Math.floor(
        (now.getTime() - new Date(attempt.started_at).getTime()) / 1000,
      ),
    );
    let cursor = 0;
    let active: SectionSlot | undefined;
    let sectionEnd: Date | undefined;
    for (const slot of schedule) {
      cursor += Number(slot.duration_seconds);
      if (elapsed < cursor) {
        active = slot;
        sectionEnd = new Date(
          new Date(attempt.started_at).getTime() + cursor * 1000,
        );
        break;
      }
    }
    if (!active) {
      await scoreAttempt(client, id, "auto_submitted");
      attempt = (
        await client.query(
          "SELECT ta.*,t.name test_name,t.review_policy FROM test_attempts ta JOIN mock_tests t ON t.id=ta.mock_test_id WHERE ta.id=$1",
          [id],
        )
      ).rows[0];
      return { attempt, serverNow: now };
    }
    if (
      attempt.current_section_id !== active.section_id ||
      !attempt.section_ends_at ||
      new Date(attempt.section_ends_at).getTime() !== sectionEnd!.getTime()
    ) {
      await client.query(
        "UPDATE test_attempts SET current_section_id=$2,section_ends_at=$3 WHERE id=$1",
        [id, active.section_id, sectionEnd],
      );
      attempt = {
        ...attempt,
        current_section_id: active.section_id,
        section_ends_at: sectionEnd,
      };
    }
  }
  return { attempt, serverNow: now };
}
attemptRouter.get("/tests", requireAuth, async (_req, res) => {
  const rows = await pool.query(
    "SELECT t.id,t.name,t.description,t.duration_seconds,t.review_policy,t.auto_generated,(SELECT count(*)::int FROM mock_test_questions mtq WHERE mtq.mock_test_id=t.id) question_count,e.id exam_id,e.name exam_name,e.category exam_category,e.pattern_cycle,e.pattern_source_url,st.name stage_name FROM mock_tests t JOIN exams e ON e.id=t.exam_id JOIN exam_stages st ON st.id=t.stage_id WHERE t.status='published' AND e.status='published' AND (t.availability_start IS NULL OR t.availability_start<=now()) AND (t.availability_end IS NULL OR t.availability_end>=now()) ORDER BY t.auto_generated ASC,t.created_at DESC",
  );
  res.json({ tests: rows.rows });
});
attemptRouter.post("/tests/:testId/attempts", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const active = await client.query(
      "SELECT id,ends_at,ends_at<=now() expired FROM test_attempts WHERE student_id=$1 AND status='in_progress' LIMIT 1 FOR UPDATE",
      [req.session.userId],
    );
    if (active.rowCount) {
      if (active.rows[0].expired)
        await scoreAttempt(client, active.rows[0].id, "auto_submitted");
      else {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({
            error:
              "You already have an active mock test. Resume it before starting another.",
          });
      }
    }
    // Hold a shared exam lock through section reads and snapshot creation. Pattern
    // edits take an exclusive lock before checking attempt history.
    const test = await client.query(
      "SELECT t.*,e.status exam_status FROM mock_tests t JOIN exams e ON e.id=t.exam_id WHERE t.id=$1 FOR SHARE OF t,e",
      [String(req.params.testId)],
    );
    if (
      !test.rowCount ||
      test.rows[0].status !== "published" ||
      test.rows[0].exam_status !== "published" ||
      (test.rows[0].availability_start &&
        new Date(test.rows[0].availability_start) > new Date()) ||
      (test.rows[0].availability_end &&
        new Date(test.rows[0].availability_end) < new Date())
    ) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Test is unavailable." });
    }
    const sections = await client.query(
      "SELECT s.id section_id,s.name section_name,s.question_count,s.duration_seconds,count(mtq.question_id)::int selected,count(q.id) FILTER(WHERE q.status='published')::int published_selected FROM exam_sections s LEFT JOIN mock_test_questions mtq ON mtq.section_id=s.id AND mtq.mock_test_id=$1 LEFT JOIN questions q ON q.id=mtq.question_id WHERE s.stage_id=$2 GROUP BY s.id ORDER BY s.sort_order,s.name",
      [String(req.params.testId), test.rows[0].stage_id],
    );
    const fullPatternReady =
      Boolean(sections.rowCount) &&
      sections.rows.every(
        (row) =>
          Number(row.question_count) > 0 &&
          Number(row.question_count) === Number(row.selected) &&
          Number(row.question_count) === Number(row.published_selected),
      );
    const stagePublishedRes = await client.query(
      "SELECT count(*)::int total FROM questions q JOIN exam_sections s ON s.id=q.section_id WHERE s.stage_id=$1 AND q.status='published'",
      [test.rows[0].stage_id],
    );
    const stagePublishedTotal = Number(stagePublishedRes.rows[0]?.total ?? 0);
    const isAutoPartialBankTest =
      Boolean(test.rows[0].auto_generated) &&
      !fullPatternReady &&
      stagePublishedTotal >= MIN_BANK_UPLOAD_QUESTIONS;

    if (!fullPatternReady && !isAutoPartialBankTest) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error: test.rows[0].auto_generated
            ? `This Question Bank mock test needs at least ${MIN_BANK_UPLOAD_QUESTIONS} published questions to start.`
            : "This test no longer matches the exam pattern or contains unpublished questions.",
        });
    }

    let questions;
    let expectedQuestionCount = sections.rows.reduce(
      (sum, row) => sum + Number(row.question_count),
      0,
    );

    if (isAutoPartialBankTest) {
      const seenRows = await client.query(
        "SELECT DISTINCT sa.question_id FROM student_answers sa JOIN test_attempts ta ON ta.id=sa.attempt_id WHERE ta.student_id=$1",
        [req.session.userId],
      );
      const targetCount = Math.min(100, stagePublishedTotal);
      expectedQuestionCount = targetCount;
      questions = await client.query(
        "WITH pool AS (SELECT q.id question_id,q.question_type,q.question_text,q.image_url,pg.title passage_title,pg.passage_text,pg.language passage_language,pg.image_url passage_image_url,q.options,q.topic_name,q.difficulty,q.correct_answer,q.explanation,q.marks,q.negative_marks,sec.id section_id,sec.name section_name,sec.sort_order sec_sort,COALESCE(sec.marks_per_correct,q.marks) effective_marks,COALESCE(sec.negative_marks,q.negative_marks) effective_negative_marks FROM questions q LEFT JOIN passage_groups pg ON pg.id=q.passage_group_id JOIN exam_sections sec ON sec.id=q.section_id WHERE sec.stage_id=$1 AND q.status='published' ORDER BY CASE WHEN NOT (q.id=ANY($2::uuid[])) THEN 0 ELSE 1 END,random() LIMIT $3) SELECT *,(row_number() OVER(ORDER BY sec_sort,random())-1)::int sort_order FROM pool ORDER BY sec_sort,sort_order",
        [
          test.rows[0].stage_id,
          seenRows.rows.map((r: any) => r.question_id),
          targetCount,
        ],
      );
    } else if (test.rows[0].selection_mode === "rule_based") {
      const seenRows = await client.query(
        "SELECT DISTINCT sa.question_id FROM student_answers sa JOIN test_attempts ta ON ta.id=sa.attempt_id WHERE ta.student_id=$1",
        [req.session.userId],
      );
      const picked = await selectNonRepeatingQuestions(client, {
        stageId: test.rows[0].stage_id,
        selectionRules: test.rows[0].selection_rules ?? [],
        preferExcludeIds: seenRows.rows.map((r: any) => r.question_id),
        shuffleWithinSection: true,
      });
      questions = await client.query(
        "SELECT q.id question_id,q.question_type,q.question_text,q.image_url,pg.title passage_title,pg.passage_text,pg.language passage_language,pg.image_url passage_image_url,q.options,q.topic_name,q.difficulty,q.correct_answer,q.explanation,q.marks,q.negative_marks,sec.id section_id,sec.name section_name,COALESCE(sec.marks_per_correct,q.marks) effective_marks,COALESCE(sec.negative_marks,q.negative_marks) effective_negative_marks,(w.pos-1)::int sort_order FROM unnest($1::uuid[]) WITH ORDINALITY w(id,pos) JOIN questions q ON q.id=w.id LEFT JOIN passage_groups pg ON pg.id=q.passage_group_id JOIN exam_sections sec ON sec.id=q.section_id WHERE q.status='published' ORDER BY sec.sort_order,w.pos",
        [picked.map((p) => p.id)],
      );
    } else {
      questions = await client.query(
        "SELECT q.id question_id,q.question_type,q.question_text,q.image_url,pg.title passage_title,pg.passage_text,pg.language passage_language,pg.image_url passage_image_url,q.options,q.topic_name,q.difficulty,q.correct_answer,q.explanation,q.marks,q.negative_marks,sec.id section_id,sec.name section_name,COALESCE(sec.marks_per_correct,q.marks) effective_marks,COALESCE(sec.negative_marks,q.negative_marks) effective_negative_marks,mtq.sort_order FROM mock_test_questions mtq JOIN questions q ON q.id=mtq.question_id LEFT JOIN passage_groups pg ON pg.id=q.passage_group_id JOIN exam_sections sec ON sec.id=mtq.section_id WHERE mtq.mock_test_id=$1 AND q.status='published' ORDER BY sec.sort_order,mtq.sort_order",
        [String(req.params.testId)],
      );
    }
    if (questions.rowCount !== expectedQuestionCount) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error:
            "This test no longer matches the exam pattern or contains unpublished questions.",
        });
    }
    const configured =
      !isAutoPartialBankTest &&
      sections.rows.some((row) => row.duration_seconds !== null);
    const incomplete =
      !isAutoPartialBankTest &&
      sections.rows.some((row) => row.duration_seconds === null);
    const schedule: SectionSlot[] =
      configured && !incomplete
        ? sections.rows.map((row) => ({
            section_id: row.section_id,
            section_name: row.section_name,
            duration_seconds: Number(row.duration_seconds),
          }))
        : [];
    const sectionSeconds = schedule.reduce(
      (total, slot) => total + slot.duration_seconds,
      0,
    );
    if (
      configured &&
      (incomplete || sectionSeconds !== Number(test.rows[0].duration_seconds))
    ) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error:
            "Section timers must be configured for every selected section and add up to the mock test duration.",
        });
    }
    const effectiveDuration = schedule.length
      ? sectionSeconds
      : Number(test.rows[0].duration_seconds);
    const attempt = (
      await client.query(
        "INSERT INTO test_attempts(student_id,mock_test_id,ends_at,section_schedule,current_section_id,section_ends_at) VALUES($1,$2,now()+($3::int*interval '1 second'),$4::jsonb,$5,CASE WHEN $6::int IS NULL THEN NULL ELSE now()+($6::int*interval '1 second') END) RETURNING id,started_at,ends_at,section_schedule,current_section_id,section_ends_at,status",
        [
          req.session.userId,
          String(req.params.testId),
          effectiveDuration,
          JSON.stringify(schedule),
          schedule[0]?.section_id ?? null,
          schedule[0]?.duration_seconds ?? null,
        ],
      )
    ).rows[0];
    for (const row of questions.rows) {
      const shuffled =
        row.question_type === "descriptive"
          ? { options: row.options, correctAnswer: row.correct_answer }
          : shuffleQuestionOptions(row.options, row.correct_answer);
      const snapshot = {
        question_type: row.question_type,
        question_text: row.question_text,
        image_url: row.image_url,
        passage_title: row.passage_title,
        passage_text: row.passage_text,
        passage_language: row.passage_language,
        passage_image_url: row.passage_image_url,
        options: shuffled.options,
        topic_name: row.topic_name,
        difficulty: row.difficulty,
        correct_answer: shuffled.correctAnswer,
        explanation: row.explanation,
        marks: Number(row.effective_marks),
        negative_marks: Number(row.effective_negative_marks),
        section_id: row.section_id,
        section_name: row.section_name,
        sort_order: row.sort_order,
      };
      await client.query(
        "INSERT INTO student_answers(attempt_id,question_id,question_snapshot) VALUES($1,$2,$3::jsonb)",
        [attempt.id, row.question_id, JSON.stringify(snapshot)],
      );
    }
    const serverNow = (await client.query("SELECT now() server_now")).rows[0]
      .server_now;
    await client.query("COMMIT");
    res.status(201).json({ attempt, serverNow });
  } catch (e) {
    await client.query("ROLLBACK");
    if ((e as any)?.code === "23505")
      return res
        .status(409)
        .json({
          error:
            "You already have an active mock test. Resume it before starting another.",
        });
    throw e;
  } finally {
    client.release();
  }
});
attemptRouter.get("/attempts/active", requireAuth, async (req, res) => {
  const row = await pool.query(
    "SELECT id FROM test_attempts WHERE student_id=$1 AND status='in_progress' ORDER BY started_at DESC LIMIT 1",
    [req.session.userId],
  );
  if (!row.rowCount) return res.json({ attempt: null });
  res.json({ attemptId: row.rows[0].id });
});
attemptRouter.get("/attempts/:id", requireAuth, async (req, res) => {
  const client = await pool.connect();
  let state: Awaited<ReturnType<typeof advanceAttempt>>;
  try {
    await client.query("BEGIN");
    state = await advanceAttempt(
      client,
      String(req.params.id),
      req.session.userId!,
    );
    if (!state) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Attempt not found." });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const attempt = state!.attempt;
  const scheduled =
    attempt.status === "in_progress" &&
    (attempt.section_schedule as SectionSlot[]).length > 0;
  let questions = (
    await pool.query(
      "SELECT sa.question_id,sa.selected_answer,sa.marked_for_review,sa.visited,sa.time_spent_seconds,sa.question_snapshot->>'question_type' question_type,sa.question_snapshot->>'question_text' question_text,sa.question_snapshot->>'image_url' image_url,sa.question_snapshot->>'passage_title' passage_title,sa.question_snapshot->>'passage_text' passage_text,sa.question_snapshot->>'passage_language' passage_language,sa.question_snapshot->>'passage_image_url' passage_image_url,sa.question_snapshot->'options' options,sa.question_snapshot->>'topic_name' topic_name,sa.question_snapshot->>'difficulty' difficulty,sa.manual_score,sa.grader_comment,sa.question_snapshot->>'section_id' section_id,sa.question_snapshot->>'section_name' section_name,CASE WHEN ta.status<>'in_progress' THEN sa.question_snapshot->>'correct_answer' END correct_answer,CASE WHEN ta.status<>'in_progress' THEN sa.question_snapshot->>'explanation' END explanation,(sa.question_snapshot->>'sort_order')::int sort_order FROM student_answers sa JOIN test_attempts ta ON ta.id=sa.attempt_id WHERE sa.attempt_id=$1 AND ($2::uuid IS NULL OR sa.question_snapshot->>'section_id'=$2::text) ORDER BY sort_order,sa.question_id",
      [String(req.params.id), scheduled ? attempt.current_section_id : null],
    )
  ).rows;
  if (
    attempt.status === "in_progress" ||
    attempt.review_policy !== "after_submit"
  )
    questions = questions.map(
      ({ correct_answer, explanation, ...visible }: any) => visible,
    );
  res.json({
    attempt,
    questions,
    serverNow: new Date(state!.serverNow).toISOString(),
  });
});
attemptRouter.put(
  "/attempts/:id/answers/:questionId",
  requireAuth,
  async (req, res) => {
    const input = validate(
      z.object({
        selectedAnswer: z.string().max(20000).nullable(),
        markedForReview: z.boolean().default(false),
        visited: z.boolean().default(true),
        timeSpentSeconds: z.number().int().nonnegative().max(86400).default(0),
      }),
      req.body,
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const state = await advanceAttempt(
        client,
        String(req.params.id),
        req.session.userId!,
      );
      if (!state) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Attempt not found." });
      }
      const attempt = state.attempt;
      if (attempt.status !== "in_progress") {
        await client.query("COMMIT");
        return res
          .status(409)
          .json({
            error: "Attempt time expired or it has already been submitted.",
          });
      }
      const question = await client.query(
        "SELECT sa.question_snapshot->>'section_id' section_id,sa.question_snapshot->>'question_type' question_type,sa.question_snapshot->'options' options FROM student_answers sa WHERE sa.attempt_id=$1 AND sa.question_id=$2",
        [String(req.params.id), String(req.params.questionId)],
      );
      if (!question.rowCount) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "Question is not part of this attempt." });
      }
      if (
        input.selectedAnswer !== null &&
        question.rows[0].question_type !== "descriptive" &&
        (input.selectedAnswer.length > 8 ||
          !question.rows[0].options.some(
            (option: { key: string }) => option.key === input.selectedAnswer,
          ))
      ) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Choose one of the listed answer options." });
      }
      if (
        attempt.current_section_id &&
        question.rows[0].section_id !== attempt.current_section_id
      ) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({
            error:
              "This section is closed. Answers can only be changed in the active section.",
          });
      }
      await client.query(
        "UPDATE student_answers sa SET selected_answer=$3,marked_for_review=$4,visited=$5,time_spent_seconds=GREATEST(sa.time_spent_seconds,LEAST($6,GREATEST(0,floor(extract(epoch FROM now()-ta.started_at))::int))),updated_at=now() FROM test_attempts ta WHERE sa.attempt_id=$1 AND sa.question_id=$2 AND ta.id=sa.attempt_id",
        [
          String(req.params.id),
          String(req.params.questionId),
          question.rows[0].question_type === "descriptive"
            ? input.selectedAnswer?.trim() || null
            : input.selectedAnswer,
          input.markedForReview,
          input.visited,
          input.timeSpentSeconds,
        ],
      );
      await client.query("COMMIT");
      res.json({
        saved: true,
        serverNow: new Date(state.serverNow).toISOString(),
        endsAt: attempt.ends_at,
        sectionEndsAt: attempt.section_ends_at,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
);
attemptRouter.post("/attempts/:id/submit", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const state = await advanceAttempt(
      client,
      String(req.params.id),
      req.session.userId!,
    );
    if (!state) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Attempt not found." });
    }
    if (state.attempt.status === "in_progress" && req.body?.auto === true) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error: "Server time has not expired yet.",
          serverNow: new Date(state.serverNow).toISOString(),
          endsAt: state.attempt.ends_at,
        });
    }
    if (state.attempt.status === "in_progress")
      await scoreAttempt(client, String(req.params.id), "submitted");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const result = (
    await pool.query(
      "SELECT id,status,score,max_score,correct_count,wrong_count,unanswered_count,pending_review_count,elapsed_seconds,submitted_at FROM test_attempts WHERE id=$1 AND student_id=$2",
      [String(req.params.id), req.session.userId],
    )
  ).rows[0];
  if (!result) return res.status(404).json({ error: "Attempt not found." });
  const sections = (
    await pool.query(
      "SELECT sr.*,s.name section_name FROM section_results sr JOIN exam_sections s ON s.id=sr.section_id JOIN test_attempts ta ON ta.id=sr.attempt_id WHERE sr.attempt_id=$1 AND ta.student_id=$2",
      [String(req.params.id), req.session.userId],
    )
  ).rows;
  res.json({ result, sections });
});
attemptRouter.get("/attempts/:id/results", requireAuth, async (req, res) => {
  const a = await pool.query(
    "SELECT ta.*,t.name test_name,t.review_policy FROM test_attempts ta JOIN mock_tests t ON t.id=ta.mock_test_id WHERE ta.id=$1 AND ta.student_id=$2 AND ta.status<>'in_progress'",
    [String(req.params.id), req.session.userId],
  );
  if (!a.rowCount)
    return res.status(404).json({ error: "Submitted result not found." });
  const sections = (
    await pool.query(
      "SELECT sr.*,s.name section_name FROM section_results sr JOIN exam_sections s ON s.id=sr.section_id WHERE sr.attempt_id=$1",
      [String(req.params.id)],
    )
  ).rows;
  const review = (
    await pool.query(
      "SELECT sa.question_id id,sa.question_snapshot->>'question_type' question_type,sa.question_snapshot->>'question_text' question_text,sa.question_snapshot->>'image_url' image_url,sa.question_snapshot->'options' options,CASE WHEN t.review_policy='after_submit' AND sa.question_snapshot->>'question_type'<>'descriptive' THEN sa.question_snapshot->>'correct_answer' END correct_answer,CASE WHEN t.review_policy='after_submit' AND sa.question_snapshot->>'question_type'<>'descriptive' THEN sa.question_snapshot->>'explanation' END explanation,sa.question_snapshot->>'difficulty' difficulty,sa.question_snapshot->>'marks' max_marks,sa.manual_score,sa.grader_comment,sa.graded_at,sa.question_snapshot->>'topic_name' topic_name,sa.selected_answer,sa.time_spent_seconds FROM student_answers sa JOIN mock_tests t ON t.id=$2 WHERE sa.attempt_id=$1 AND (t.review_policy='after_submit' OR (sa.question_snapshot->>'question_type'='descriptive' AND sa.manual_score IS NOT NULL)) ORDER BY (sa.question_snapshot->>'sort_order')::int,sa.question_id",
      [String(req.params.id), a.rows[0].mock_test_id],
    )
  ).rows;
  res.json({ result: a.rows[0], sections, review });
});
attemptRouter.get("/bookmarks", requireAuth, async (req, res) => {
  const rows = await pool.query(
    "SELECT b.created_at,q.id,q.question_type,q.question_text,q.image_url,pg.title passage_title,pg.passage_text,pg.language passage_language,pg.image_url passage_image_url,q.options,q.topic_name,q.difficulty,q.language,q.source,q.source_year,s.id section_id,s.name section_name,st.name stage_name,e.name exam_name FROM bookmarks b JOIN questions q ON q.id=b.question_id LEFT JOIN passage_groups pg ON pg.id=q.passage_group_id JOIN exam_sections s ON s.id=q.section_id JOIN exam_stages st ON st.id=s.stage_id JOIN exams e ON e.id=st.exam_id WHERE b.student_id=$1 AND q.status='published' AND e.status='published' ORDER BY b.created_at DESC",
    [req.session.userId],
  );
  res.json({ bookmarks: rows.rows });
});
attemptRouter.put("/bookmarks/:questionId", requireAuth, async (req, res) => {
  const ok = await pool.query(
    "SELECT id FROM questions WHERE id=$1 AND status='published'",
    [String(req.params.questionId)],
  );
  if (!ok.rowCount)
    return res.status(404).json({ error: "Question not found." });
  await pool.query(
    "INSERT INTO bookmarks(student_id,question_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [req.session.userId, String(req.params.questionId)],
  );
  res.status(204).end();
});
attemptRouter.delete(
  "/bookmarks/:questionId",
  requireAuth,
  async (req, res) => {
    await pool.query(
      "DELETE FROM bookmarks WHERE student_id=$1 AND question_id=$2",
      [req.session.userId, String(req.params.questionId)],
    );
    res.status(204).end();
  },
);
attemptRouter.get("/leaderboard", requireAuth, async (req, res) => {
  const period = z
    .enum(["weekly", "monthly", "overall"])
    .catch("weekly")
    .parse(req.query.period);
  const bucket = period === "weekly" ? "week" : "month";
  const rows = await pool.query(
    "SELECT u.id,u.full_name,max(l.score) best_score,count(DISTINCT l.attempt_id)::int attempts FROM leaderboard_records l JOIN users u ON u.id=l.student_id WHERE l.period_type=$1 AND ($1='overall' OR l.period_start>=date_trunc($2,now())::date) GROUP BY u.id ORDER BY best_score DESC,attempts DESC LIMIT 100",
    [period, bucket],
  );
  res.json({ period, entries: rows.rows });
});
attemptRouter.get("/achievements", requireAuth, async (req, res) => {
  const snapshot = await getLiveAchievementsSnapshot(req.session.userId!);
  res.json(snapshot);
});
