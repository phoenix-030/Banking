export const EXAM_CATEGORIES = [
  "IBPS",
  "SBI",
  "RBI",
  "NABARD",
  "Other Banks / Institutions",
] as const;

export interface ExamGroup<T> {
  category: string;
  exams: T[];
}

export function groupExamsByCategory<T extends { category?: string | null }>(
  exams: T[],
): ExamGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const cat of EXAM_CATEGORIES) buckets.set(cat, []);
  for (const exam of exams) {
    const key = exam.category?.trim() || "Other Banks / Institutions";
    const list = buckets.get(key) ?? [];
    list.push(exam);
    buckets.set(key, list);
  }
  const groups: ExamGroup<T>[] = [];
  for (const [category, items] of buckets.entries()) {
    if (items.length) groups.push({ category, exams: items });
  }
  return groups;
}

export function ExamOptGroups<T extends { category?: string | null }>({
  exams,
  getKey,
  getValue,
  getLabel,
}: {
  exams: T[];
  getKey: (exam: T, globalIndex: number) => string;
  getValue: (exam: T, globalIndex: number) => string | number;
  getLabel: (exam: T) => string;
}) {
  const indexMap = new Map<T, number>();
  exams.forEach((exam, idx) => indexMap.set(exam, idx));
  const groups = groupExamsByCategory(exams);

  return (
    <>
      {groups.map((group) => (
        <optgroup
          key={group.category}
          label={`${group.category} (${group.exams.length})`}
        >
          {group.exams.map((exam) => {
            const idx = indexMap.get(exam) ?? 0;
            return (
              <option key={getKey(exam, idx)} value={getValue(exam, idx)}>
                {getLabel(exam)}
              </option>
            );
          })}
        </optgroup>
      ))}
    </>
  );
}
