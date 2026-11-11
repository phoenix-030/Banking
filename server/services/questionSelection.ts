import crypto from 'node:crypto';
import type { PoolClient } from 'pg';

export interface SelectionTopicRule {
  topicName: string;
  percent: number;
}

export interface SectionSelectionRule {
  sectionId: string;
  topicDistribution?: SelectionTopicRule[];
  easyPercent: number;
  mediumPercent: number;
  hardPercent: number;
}

export interface PickedQuestion {
  id: string;
  section_id: string;
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleQuestionOptions(
  rawOptions: unknown,
  correctAnswer: string | null | undefined,
): { options: Array<Record<string, unknown>>; correctAnswer: string | null } {
  const parsed =
    typeof rawOptions === 'string'
      ? JSON.parse(rawOptions)
      : Array.isArray(rawOptions)
        ? rawOptions
        : [];

  if (!Array.isArray(parsed) || parsed.length < 2) {
    return {
      options: Array.isArray(parsed) ? parsed : [],
      correctAnswer: correctAnswer ?? null,
    };
  }

  const normalized = parsed.map((item: any, idx: number) => ({
    key: String(item?.key ?? String.fromCharCode(65 + idx)),
    item: typeof item === 'object' && item !== null ? { ...item } : { text: String(item ?? '') },
    isCorrect:
      correctAnswer != null &&
      String(item?.key ?? '') === String(correctAnswer),
  }));

  const slotKeys = normalized.map((entry) => entry.key);
  const shuffled = shuffleArray(normalized);

  let nextCorrectKey: string | null = correctAnswer ?? null;
  const options = shuffled.map((entry, idx) => {
    const assignedKey = slotKeys[idx];
    if (entry.isCorrect) {
      nextCorrectKey = assignedKey;
    }
    return {
      ...entry.item,
      key: assignedKey,
    };
  });

  return { options, correctAnswer: nextCorrectKey };
}

export async function selectNonRepeatingQuestions(
  client: PoolClient,
  params: {
    stageId: string;
    selectionRules: SectionSelectionRule[];
    excludeQuestionIds?: string[];
    preferExcludeIds?: string[];
    shuffleWithinSection?: boolean;
  },
): Promise<PickedQuestion[]> {
  const sections = await client.query(
    'SELECT id, name, question_count FROM exam_sections WHERE stage_id = $1 ORDER BY sort_order, id',
    [params.stageId],
  );

  if (
    !sections.rowCount ||
    sections.rows.some((section: any) => Number(section.question_count) <= 0)
  ) {
    throw Object.assign(
      new Error(
        'Automatic selection requires positive question counts in every configured section.',
      ),
      { status: 409 },
    );
  }

  const ruleMap = new Map<string, SectionSelectionRule>(
    params.selectionRules.map((rule) => [rule.sectionId, rule]),
  );

  // Build default rules automatically if an existing test or caller omits rules for some sections
  const usedIds = new Set<string>(params.excludeQuestionIds ?? []);
  const preferIds = Array.from(new Set(params.preferExcludeIds ?? []));
  const finalPicked: PickedQuestion[] = [];

  for (const section of sections.rows) {
    const questionCount = Number(section.question_count);
    const rule: SectionSelectionRule = ruleMap.get(section.id) ?? {
      sectionId: section.id,
      topicDistribution: [],
      easyPercent: 30,
      mediumPercent: 50,
      hardPercent: 20,
    };

    const topics = rule.topicDistribution?.length
      ? rule.topicDistribution.map((topic) => ({
          topicName: topic.topicName,
          percent: topic.percent,
        }))
      : [{ topicName: null as string | null, percent: 100 }];

    const difficulties = [
      ['easy', rule.easyPercent],
      ['medium', rule.mediumPercent],
      ['hard', rule.hardPercent],
    ] as const;

    const cells = topics.flatMap((topic) =>
      difficulties.map(([difficulty, percent]) => {
        const share = topic.percent * percent;
        return {
          topicName: topic.topicName,
          difficulty,
          count: Math.floor((questionCount * share) / 10000),
          remainder: (questionCount * share) % 10000,
        };
      }),
    );

    let unassigned =
      questionCount - cells.reduce((total, cell) => total + cell.count, 0);

    for (const cell of [...cells].sort((a, b) => b.remainder - a.remainder)) {
      if (unassigned > 0) {
        cell.count++;
        unassigned--;
      }
    }

    const sectionPicked: PickedQuestion[] = [];

    for (const cell of cells) {
      if (!cell.count) continue;
      const matches = await client.query(
        `SELECT q.id, q.section_id
         FROM questions q
         WHERE q.section_id = $1
           AND q.status = 'published'
           AND q.difficulty = $2
           AND ($3::text IS NULL OR q.topic_name = $3)
           AND NOT (q.id = ANY($4::uuid[]))
         ORDER BY
           CASE WHEN NOT (q.id = ANY($5::uuid[])) THEN 0 ELSE 1 END,
           random()
         LIMIT $6`,
        [
          section.id,
          cell.difficulty,
          cell.topicName,
          Array.from(usedIds),
          preferIds,
          cell.count,
        ],
      );

      for (const row of matches.rows) {
        usedIds.add(row.id);
        sectionPicked.push(row);
      }
    }

    // Fill any remaining shortfall within the same section using unique unused published questions
    const shortfall = questionCount - sectionPicked.length;
    if (shortfall > 0) {
      const fallback = await client.query(
        `SELECT q.id, q.section_id
         FROM questions q
         WHERE q.section_id = $1
           AND q.status = 'published'
           AND NOT (q.id = ANY($2::uuid[]))
         ORDER BY
           CASE WHEN NOT (q.id = ANY($3::uuid[])) THEN 0 ELSE 1 END,
           random()
         LIMIT $4`,
        [section.id, Array.from(usedIds), preferIds, shortfall],
      );

      for (const row of fallback.rows) {
        usedIds.add(row.id);
        sectionPicked.push(row);
      }
    }

    if (sectionPicked.length !== questionCount) {
      throw Object.assign(
        new Error(
          `Section "${section.name}" requires ${questionCount} unique published questions, but only ${sectionPicked.length} are available.`,
        ),
        { status: 409 },
      );
    }

    finalPicked.push(
      ...(params.shuffleWithinSection
        ? shuffleArray(sectionPicked)
        : sectionPicked),
    );
  }

  return finalPicked;
}
