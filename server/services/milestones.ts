import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';

type Queryable = Pool | PoolClient;

export type MilestoneCategory = 'streak' | 'practice' | 'mock' | 'rank';

export interface LiveMetrics {
  currentStreak: number;
  bestStreak: number;
  studiedToday: boolean;
  streakStatus: 'active_today' | 'at_risk' | 'inactive';
  lastActivityDate: string | null;
  todayQuestions: number;
  dailyGoal: number;
  totalQuestions: number;
  completedMocks: number;
  bestMockAccuracy: number;
  overallAccuracy: number;
  bestRank: number | null;
  weeklyActivity: Array<{
    date: string;
    label: string;
    count: number;
    active: boolean;
    isToday: boolean;
  }>;
  weekActiveDays: number;
  serverNow: string;
}

interface MilestoneRule {
  code: string;
  name: string;
  description: string;
  category: MilestoneCategory;
  sortOrder: number;
  actionPage: string;
  actionLabel: string;
  evaluate: (m: LiveMetrics) => {
    earned: boolean;
    current: number;
    target: number;
    percent: number;
    progressText: string;
  };
}

const IST_TODAY_SQL = "(now() AT TIME ZONE 'Asia/Kolkata')::date";
const DAILY_QUESTION_GOAL = 10;

const MILESTONE_RULES: MilestoneRule[] = [
  {
    code: 'first_step',
    name: 'First Question Answered',
    description:
      'Answer your first question across practice, daily challenge, current affairs, or mocks.',
    category: 'practice',
    sortOrder: 1,
    actionPage: 'Practice',
    actionLabel: 'Start practice',
    evaluate: (m) => {
      const current = Math.min(m.totalQuestions, 1);
      return {
        earned: m.totalQuestions >= 1,
        current,
        target: 1,
        percent: current * 100,
        progressText:
          m.totalQuestions >= 1 ? '1 / 1 question solved' : '0 / 1 question solved',
      };
    },
  },
  {
    code: 'three_day_streak',
    name: '3-Day Streak',
    description: 'Study on three consecutive days.',
    category: 'streak',
    sortOrder: 2,
    actionPage: 'Daily challenge',
    actionLabel: 'Open daily challenge',
    evaluate: (m) => {
      const earned = m.currentStreak >= 3 || m.bestStreak >= 3;
      const current = earned ? 3 : Math.min(m.currentStreak, 3);
      return {
        earned,
        current,
        target: 3,
        percent: Math.round((current / 3) * 100),
        progressText: `${current} / 3 consecutive days`,
      };
    },
  },
  {
    code: 'twenty_five_questions',
    name: '25 Questions Completed',
    description:
      'Answer 25 questions across practice, daily challenges, current affairs, or mocks.',
    category: 'practice',
    sortOrder: 3,
    actionPage: 'Practice',
    actionLabel: 'Practice questions',
    evaluate: (m) => {
      const current = Math.min(m.totalQuestions, 25);
      return {
        earned: m.totalQuestions >= 25,
        current,
        target: 25,
        percent: Math.round((current / 25) * 100),
        progressText: `${current} / 25 questions`,
      };
    },
  },
  {
    code: 'seven_day_streak',
    name: '7-Day Streak',
    description: 'Study on seven consecutive days.',
    category: 'streak',
    sortOrder: 4,
    actionPage: 'Daily challenge',
    actionLabel: 'Keep streak alive',
    evaluate: (m) => {
      const earned = m.currentStreak >= 7 || m.bestStreak >= 7;
      const current = earned ? 7 : Math.min(m.currentStreak, 7);
      const bestNote =
        !earned && m.bestStreak > m.currentStreak
          ? ` (best ${m.bestStreak}d)`
          : '';
      return {
        earned,
        current,
        target: 7,
        percent: Math.round((current / 7) * 100),
        progressText: `${current} / 7 consecutive days${bestNote}`,
      };
    },
  },
  {
    code: 'hundred_questions',
    name: '100 Questions Completed',
    description:
      'Answer 100 questions across practice, daily challenges, current affairs, or mocks.',
    category: 'practice',
    sortOrder: 5,
    actionPage: 'Practice',
    actionLabel: 'Continue practice',
    evaluate: (m) => {
      const current = Math.min(m.totalQuestions, 100);
      return {
        earned: m.totalQuestions >= 100,
        current,
        target: 100,
        percent: Math.round((current / 100) * 100),
        progressText: `${current} / 100 questions`,
      };
    },
  },
  {
    code: 'first_mock',
    name: 'First Mock Test',
    description: 'Complete your first mock examination.',
    category: 'mock',
    sortOrder: 6,
    actionPage: 'Mock tests',
    actionLabel: 'Take mock test',
    evaluate: (m) => {
      const current = Math.min(m.completedMocks, 1);
      return {
        earned: m.completedMocks >= 1,
        current,
        target: 1,
        percent: current * 100,
        progressText:
          m.completedMocks >= 1
            ? `${m.completedMocks} mock${m.completedMocks > 1 ? 's' : ''} completed`
            : '0 / 1 mock completed',
      };
    },
  },
  {
    code: 'ninety_accuracy',
    name: '90% Accuracy',
    description: 'Achieve at least 90% accuracy in an eligible attempt.',
    category: 'mock',
    sortOrder: 7,
    actionPage: 'Mock tests',
    actionLabel: 'Attempt a mock',
    evaluate: (m) => {
      const current = Math.min(m.bestMockAccuracy, 90);
      const percent = Math.min(
        100,
        Math.round((m.bestMockAccuracy / 90) * 100),
      );
      const progressText =
        m.completedMocks > 0
          ? `Best mock: ${m.bestMockAccuracy}% / 90%`
          : m.overallAccuracy > 0
            ? `Practice accuracy: ${m.overallAccuracy}% · Mock target: 90%`
            : '0% / 90% mock accuracy';
      return {
        earned: m.bestMockAccuracy >= 90,
        current,
        target: 90,
        percent,
        progressText,
      };
    },
  },
  {
    code: 'top_ten',
    name: 'Top 10 Ranking',
    description: 'Place in the top ten of an eligible leaderboard period.',
    category: 'rank',
    sortOrder: 8,
    actionPage: 'Leaderboard',
    actionLabel: 'View leaderboard',
    evaluate: (m) => {
      if (m.bestRank === null) {
        return {
          earned: false,
          current: 0,
          target: 10,
          percent: 0,
          progressText: 'No mock rank yet · Top 10 target',
        };
      }
      if (m.bestRank <= 10) {
        return {
          earned: true,
          current: 10,
          target: 10,
          percent: 100,
          progressText: `Best rank #${m.bestRank} achieved`,
        };
      }
      return {
        earned: false,
        current: Math.max(1, Math.round((10 / m.bestRank) * 10)),
        target: 10,
        percent: Math.max(10, Math.min(95, Math.round((10 / m.bestRank) * 100))),
        progressText: `Current rank #${m.bestRank} · Top 10 needed`,
      };
    },
  },
];

let definitionsSeeded = false;

export async function ensureAchievementsSeeded(db: Queryable = pool): Promise<void> {
  if (definitionsSeeded) return;
  for (const rule of MILESTONE_RULES) {
    await db.query(
      'INSERT INTO achievements(code, name, description) VALUES($1, $2, $3) ON CONFLICT (code) DO NOTHING',
      [rule.code, rule.name, rule.description],
    );
  }
  definitionsSeeded = true;
}

export async function recordStudyDay(
  studentId: string,
  db: Queryable = pool,
): Promise<{ currentDays: number; bestDays: number }> {
  await ensureAchievementsSeeded(db);
  const res = await db.query(
    `INSERT INTO student_streaks(student_id, current_days, best_days, last_activity_date)
     VALUES($1, 1, 1, ${IST_TODAY_SQL})
     ON CONFLICT(student_id) DO UPDATE SET
       current_days = CASE
         WHEN student_streaks.last_activity_date = ${IST_TODAY_SQL} THEN GREATEST(student_streaks.current_days, 1)
         WHEN student_streaks.last_activity_date = (${IST_TODAY_SQL} - 1) THEN student_streaks.current_days + 1
         ELSE 1
       END,
       best_days = GREATEST(
         student_streaks.best_days,
         CASE
           WHEN student_streaks.last_activity_date = ${IST_TODAY_SQL} THEN GREATEST(student_streaks.current_days, 1)
           WHEN student_streaks.last_activity_date = (${IST_TODAY_SQL} - 1) THEN student_streaks.current_days + 1
           ELSE 1
         END
       ),
       last_activity_date = ${IST_TODAY_SQL}
     RETURNING current_days, best_days`,
    [studentId],
  );
  const currentDays = Number(res.rows[0]?.current_days ?? 1);
  const bestDays = Number(res.rows[0]?.best_days ?? 1);
  const streakCodes: string[] = ['first_step'];
  if (currentDays >= 3 || bestDays >= 3) streakCodes.push('three_day_streak');
  if (currentDays >= 7 || bestDays >= 7) streakCodes.push('seven_day_streak');
  await db.query(
    `INSERT INTO student_achievements(student_id, achievement_id)
     SELECT $1, id FROM achievements WHERE code = ANY($2::text[])
     ON CONFLICT DO NOTHING`,
    [studentId, streakCodes],
  );
  return { currentDays, bestDays };
}

async function computeRawMetrics(
  studentId: string,
  db: Queryable,
): Promise<{ metrics: LiveMetrics; needsTodayStreakSync: boolean }> {
  const [activityRes, statsRes, streakRes, rankRes, weeklyRes] = await Promise.all([
    db.query(
      `WITH all_answers AS (
         SELECT
           CASE WHEN sa.question_snapshot->>'question_type'='descriptive' THEN NULL ELSE sa.selected_answer = sa.question_snapshot->>'correct_answer' END AS is_correct,
           (coalesce(ta.submitted_at, sa.updated_at) AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM student_answers sa
         JOIN test_attempts ta ON ta.id = sa.attempt_id
         WHERE ta.student_id = $1 AND ta.status <> 'in_progress' AND sa.selected_answer IS NOT NULL
         UNION ALL
         SELECT
           pa.is_correct,
           (coalesce(pa.answered_at, ps.started_at) AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM practice_answers pa
         JOIN practice_sessions ps ON ps.id = pa.session_id
         WHERE ps.student_id = $1 AND pa.selected_answer IS NOT NULL
         UNION ALL
         SELECT
           ca.is_correct,
           (ca.answered_at AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM current_affairs_answers ca
         WHERE ca.student_id = $1
         UNION ALL
         SELECT
           dq.is_correct,
           coalesce((dq.answered_at AT TIME ZONE 'Asia/Kolkata')::date, ds.challenge_date) AS act_date
         FROM daily_challenge_questions dq
         JOIN daily_challenge_sessions ds ON ds.id = dq.session_id
         WHERE ds.student_id = $1 AND dq.selected_answer IS NOT NULL
       )
       SELECT
         count(*)::int AS total_questions,
         count(*) FILTER (WHERE act_date = ${IST_TODAY_SQL})::int AS today_questions,
         coalesce(avg(is_correct::int) FILTER (WHERE is_correct IS NOT NULL) * 100, 0)::numeric(6,1) AS overall_accuracy
       FROM all_answers`,
      [studentId],
    ),
    db.query(
      `SELECT
         count(*)::int AS completed_mocks,
         coalesce(max(
           CASE WHEN coalesce(correct_count, 0) + coalesce(wrong_count, 0) > 0
             THEN round((correct_count::numeric / (correct_count + wrong_count)) * 100, 1)
             ELSE 0
           END
         ), 0)::numeric(6,1) AS best_mock_accuracy
       FROM test_attempts
       WHERE student_id = $1 AND status <> 'in_progress'`,
      [studentId],
    ),
    db.query(
      `SELECT
         coalesce(current_days, 0)::int AS raw_current_days,
         coalesce(best_days, 0)::int AS best_days,
         to_char(last_activity_date, 'YYYY-MM-DD') AS last_activity_date,
         (last_activity_date = ${IST_TODAY_SQL}) AS studied_today,
         (last_activity_date = (${IST_TODAY_SQL} - 1)) AS studied_yesterday
       FROM student_streaks
       WHERE student_id = $1`,
      [studentId],
    ),
    db.query(
      `WITH ranked AS (
         SELECT
           period_type,
           student_id,
           rank() OVER(PARTITION BY period_type ORDER BY max(score) DESC, count(DISTINCT attempt_id) DESC) AS pos
         FROM leaderboard_records
         WHERE period_type = 'overall'
            OR (period_type = 'weekly' AND period_start >= date_trunc('week', now())::date)
            OR (period_type = 'monthly' AND period_start >= date_trunc('month', now())::date)
         GROUP BY period_type, student_id
       )
       SELECT min(pos)::int AS best_rank FROM ranked WHERE student_id = $1`,
      [studentId],
    ),
    db.query(
      `WITH days AS (
         SELECT gs::date AS d
         FROM generate_series(${IST_TODAY_SQL} - 6, ${IST_TODAY_SQL}, interval '1 day') AS gs
       ),
       all_answers AS (
         SELECT (coalesce(ta.submitted_at, sa.updated_at) AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM student_answers sa
         JOIN test_attempts ta ON ta.id = sa.attempt_id
         WHERE ta.student_id = $1 AND ta.status <> 'in_progress' AND sa.selected_answer IS NOT NULL
         UNION ALL
         SELECT (coalesce(pa.answered_at, ps.started_at) AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM practice_answers pa
         JOIN practice_sessions ps ON ps.id = pa.session_id
         WHERE ps.student_id = $1 AND pa.selected_answer IS NOT NULL
         UNION ALL
         SELECT (ca.answered_at AT TIME ZONE 'Asia/Kolkata')::date AS act_date
         FROM current_affairs_answers ca
         WHERE ca.student_id = $1
         UNION ALL
         SELECT coalesce((dq.answered_at AT TIME ZONE 'Asia/Kolkata')::date, ds.challenge_date) AS act_date
         FROM daily_challenge_questions dq
         JOIN daily_challenge_sessions ds ON ds.id = dq.session_id
         WHERE ds.student_id = $1 AND dq.selected_answer IS NOT NULL
       ),
       counts AS (
         SELECT act_date, count(*)::int AS cnt FROM all_answers GROUP BY act_date
       )
       SELECT
         to_char(days.d, 'YYYY-MM-DD') AS date,
         to_char(days.d, 'Dy') AS label,
         coalesce(counts.cnt, 0)::int AS count,
         (coalesce(counts.cnt, 0) > 0) AS active,
         (days.d = ${IST_TODAY_SQL}) AS is_today
       FROM days
       LEFT JOIN counts ON counts.act_date = days.d
       ORDER BY days.d`,
      [studentId],
    ),
  ]);

  const aRow = activityRes.rows[0] ?? {};
  const sRow = statsRes.rows[0] ?? {};
  const stRow = streakRes.rows[0] ?? null;
  const todayQuestions = Number(aRow.today_questions ?? 0);
  const recordedToday = Boolean(stRow?.studied_today);
  const studiedYesterday = Boolean(stRow?.studied_yesterday);
  const rawCurrent = Number(stRow?.raw_current_days ?? 0);
  const effectiveCurrent = recordedToday || studiedYesterday ? rawCurrent : 0;
  const bestStreak = Number(stRow?.best_days ?? 0);
  const weeklyActivity = weeklyRes.rows.map((r) => ({
    date: String(r.date),
    label: String(r.label).trim(),
    count: Number(r.count ?? 0),
    active: Boolean(r.active),
    isToday: Boolean(r.is_today),
  }));

  const streakStatus: LiveMetrics['streakStatus'] = recordedToday
    ? 'active_today'
    : effectiveCurrent > 0
      ? 'at_risk'
      : 'inactive';

  return {
    needsTodayStreakSync: todayQuestions > 0 && !recordedToday,
    metrics: {
      currentStreak: effectiveCurrent,
      bestStreak,
      studiedToday: recordedToday,
      streakStatus,
      lastActivityDate: stRow?.last_activity_date ?? null,
      todayQuestions,
      dailyGoal: DAILY_QUESTION_GOAL,
      totalQuestions: Number(aRow.total_questions ?? 0),
      completedMocks: Number(sRow.completed_mocks ?? 0),
      bestMockAccuracy: Number(sRow.best_mock_accuracy ?? 0),
      overallAccuracy: Number(aRow.overall_accuracy ?? 0),
      bestRank:
        rankRes.rows[0]?.best_rank !== null &&
        rankRes.rows[0]?.best_rank !== undefined
          ? Number(rankRes.rows[0].best_rank)
          : null,
      weeklyActivity,
      weekActiveDays: weeklyActivity.filter((d) => d.active).length,
      serverNow: new Date().toISOString(),
    },
  };
}

export async function syncMilestones(
  studentId: string,
  db: Queryable = pool,
): Promise<void> {
  await ensureAchievementsSeeded(db);
  const { metrics } = await computeRawMetrics(studentId, db);
  const qualifiedCodes = MILESTONE_RULES.filter(
    (rule) => rule.evaluate(metrics).earned,
  ).map((r) => r.code);
  if (qualifiedCodes.length) {
    await db.query(
      `INSERT INTO student_achievements(student_id, achievement_id)
       SELECT $1, id FROM achievements WHERE code = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [studentId, qualifiedCodes],
    );
  }
}

export async function getLiveAchievementsSnapshot(
  studentId: string,
  db: Queryable = pool,
) {
  await ensureAchievementsSeeded(db);
  let { metrics, needsTodayStreakSync } = await computeRawMetrics(studentId, db);
  if (needsTodayStreakSync) {
    await recordStudyDay(studentId, db);
    ({ metrics } = await computeRawMetrics(studentId, db));
  }

  const newlyEarned = MILESTONE_RULES.filter(
    (rule) => rule.evaluate(metrics).earned,
  ).map((r) => r.code);
  if (newlyEarned.length) {
    await db.query(
      `INSERT INTO student_achievements(student_id, achievement_id)
       SELECT $1, id FROM achievements WHERE code = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [studentId, newlyEarned],
    );
  }

  const rows = await db.query(
    `SELECT a.code, a.name, a.description, sa.earned_at
     FROM achievements a
     LEFT JOIN student_achievements sa
       ON sa.achievement_id = a.id AND sa.student_id = $1`,
    [studentId],
  );
  const dbMap = new Map(rows.rows.map((r) => [String(r.code), r]));
  const ruleMap = new Map(MILESTONE_RULES.map((r) => [r.code, r]));

  const achievements = MILESTONE_RULES.map((rule) => {
    const row = dbMap.get(rule.code);
    const evalOut = rule.evaluate(metrics);
    const unlocked = Boolean(row?.earned_at) || evalOut.earned;
    const percent = unlocked ? 100 : evalOut.percent;
    const statusLabel = unlocked
      ? 'UNLOCKED'
      : percent > 0
        ? 'LIVE PROGRESS'
        : 'UP NEXT';

    return {
      code: rule.code,
      name: row?.name ?? rule.name,
      description: row?.description ?? rule.description,
      category: rule.category,
      earned_at: row?.earned_at ?? null,
      current: unlocked ? evalOut.target : evalOut.current,
      target: evalOut.target,
      percent,
      progressText: evalOut.progressText,
      statusLabel,
      actionPage: rule.actionPage,
      actionLabel: rule.actionLabel,
    };
  });

  // Include any custom DB-only achievements not listed in MILESTONE_RULES
  for (const [code, row] of dbMap.entries()) {
    if (ruleMap.has(code)) continue;
    const unlocked = Boolean(row.earned_at);
    achievements.push({
      code,
      name: String(row.name),
      description: String(row.description),
      category: 'practice',
      earned_at: row.earned_at ?? null,
      current: unlocked ? 1 : 0,
      target: 1,
      percent: unlocked ? 100 : 0,
      progressText: unlocked ? 'Completed' : 'In preparation',
      statusLabel: unlocked ? 'UNLOCKED' : 'UP NEXT',
      actionPage: 'Practice',
      actionLabel: 'Continue practice',
    });
  }

  const unlockedCount = achievements.filter((a) => a.earned_at).length;

  return {
    streak: {
      currentDays: metrics.currentStreak,
      bestDays: metrics.bestStreak,
      studiedToday: metrics.studiedToday,
      status: metrics.streakStatus,
      lastActivityDate: metrics.lastActivityDate,
      todayQuestions: metrics.todayQuestions,
      dailyGoal: metrics.dailyGoal,
      weekActiveDays: metrics.weekActiveDays,
      weeklyActivity: metrics.weeklyActivity,
    },
    liveStats: {
      totalQuestions: metrics.totalQuestions,
      completedMocks: metrics.completedMocks,
      bestMockAccuracy: metrics.bestMockAccuracy,
      overallAccuracy: metrics.overallAccuracy,
      bestRank: metrics.bestRank,
      unlockedCount,
      totalMilestones: achievements.length,
      completionPercent: achievements.length
        ? Math.round((unlockedCount / achievements.length) * 100)
        : 0,
    },
    achievements,
    serverNow: metrics.serverNow,
  };
}
