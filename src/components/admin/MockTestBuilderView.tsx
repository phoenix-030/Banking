import { useEffect, useState } from "react";
import { ArrowRight, FileQuestion } from "lucide-react";
import { Field } from "../common/Field";
import { RuleBasedSelector } from "./RuleBasedSelector";
import { ExamOptGroups } from "../../utils/examCategories";

function buildTestNameGroups(selectedExam: any, stage: any, tests: any[]) {
  const series =
    selectedExam && stage
      ? [
          ...[1, 2, 3, 4, 5].map(
            (n) => `${selectedExam.name} ${stage.name} - Full Mock Test ${n}`,
          ),
          `${selectedExam.name} ${stage.name} - Live All-India Mock`,
          `${selectedExam.name} ${stage.name} - Speed & Accuracy Test`,
          `${selectedExam.name} ${stage.name} - Memory-Based Pattern Test`,
        ]
      : [
          ...[1, 2, 3, 4, 5].map((n) => `Full Mock Test ${n}`),
          "Live All-India Mock",
          "Speed & Accuracy Test",
          "Memory-Based Pattern Test",
        ];

  const sectional: string[] =
    selectedExam && stage
      ? (stage.sections ?? []).map(
          (sec: any) =>
            `${selectedExam.name} ${stage.name} - ${sec.name} Sectional Test`,
        )
      : [];

  const known = new Set([...series, ...sectional]);
  const existing: string[] = [
    ...new Set(
      tests
        .filter((t) =>
          selectedExam && stage
            ? t.exam_id === selectedExam.id && t.stage_id === stage.id
            : true,
        )
        .map((t) => String(t.name ?? ""))
        .filter((name) => Boolean(name) && !known.has(name)),
    ),
  ];

  return {
    series,
    sectional,
    existing,
    all: [...series, ...sectional, ...existing],
  };
}

function formatAvailabilityWindow(start?: string | null, end?: string | null) {
  if (!start && !end) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

interface MockTestBuilderViewProps {
  tests: any[];
  exams: any[];
  questions: any[];
  builder: boolean;
  editingTestId: string;
  examId: string;
  stageId: string;
  testName: string;
  description: string;
  duration: number;
  reviewPolicy: string;
  selectionMode: string;
  selectionRules: any[];
  availabilityStart: string;
  availabilityEnd: string;
  selected: string[];
  busy: boolean;
  onSetBuilder: (open: boolean) => void;
  onResetTestBuilder: () => void;
  onEditTest: (t: any) => void;
  onChangeStatus: (id: string, status: string) => void;
  onCreateTest: () => void;
  onExamChange: (examId: string) => void;
  onStageChange: (stageId: string) => void;
  onSetTestName: (name: string) => void;
  onSetDescription: (desc: string) => void;
  onSetDuration: (dur: number) => void;
  onSetReviewPolicy: (policy: string) => void;
  onSetSelectionMode: (mode: string) => void;
  onSetSelectionRules: (rules: any[]) => void;
  onSetAvailabilityStart: (start: string) => void;
  onSetAvailabilityEnd: (end: string) => void;
  onSetSelected: React.Dispatch<React.SetStateAction<string[]>>;
}

export function MockTestBuilderView({
  tests,
  exams,
  questions,
  builder,
  editingTestId,
  examId,
  stageId,
  testName,
  description,
  duration,
  reviewPolicy,
  selectionMode,
  selectionRules,
  availabilityStart,
  availabilityEnd,
  selected,
  busy,
  onSetBuilder,
  onResetTestBuilder,
  onEditTest,
  onChangeStatus,
  onCreateTest,
  onExamChange,
  onStageChange,
  onSetTestName,
  onSetDescription,
  onSetDuration,
  onSetReviewPolicy,
  onSetSelectionMode,
  onSetSelectionRules,
  onSetAvailabilityStart,
  onSetAvailabilityEnd,
  onSetSelected,
}: MockTestBuilderViewProps) {
  const selectedExam = exams.find((e) => e.id === examId);
  const stages = selectedExam?.stages ?? [];
  const stage = stages.find((s: any) => s.id === stageId);
  const eligibleQuestions = questions.filter(
    (q) =>
      q.exam_name === selectedExam?.name &&
      q.stage_name === stage?.name,
  );
  const testNameGroups = buildTestNameGroups(selectedExam, stage, tests);
  const [customNameMode, setCustomNameMode] = useState(false);

  useEffect(() => {
    setCustomNameMode(false);
  }, [examId, stageId, editingTestId, builder]);

  const isCustomTestName =
    customNameMode ||
    (Boolean(testName) && !testNameGroups.all.includes(testName));
  const testNameSelectValue = isCustomTestName ? "__custom__" : testName;

  const selectionRulesValid =
    Boolean(stage?.sections?.length) &&
    stage.sections.every((section: any) => {
      const rule = selectionRules.find(
        (item: any) => item.sectionId === section.id,
      );
      return (
        Boolean(rule) &&
        Number(rule.easyPercent) +
          Number(rule.mediumPercent) +
          Number(rule.hardPercent) ===
          100 &&
        (!(rule.topicDistribution?.length) ||
          rule.topicDistribution.reduce(
            (sum: number, item: any) => sum + Number(item.percent),
            0,
          ) === 100)
      );
    });

  return (
    <>
      <section className="panel admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="section-kicker">TEST MANAGEMENT</span>
            <h2>Mock tests</h2>
          </div>
          <button
            className="primary-btn"
            onClick={() => {
              if (builder) onResetTestBuilder();
              else onSetBuilder(true);
            }}
          >
            {builder ? "Create another test" : "Create mock test"}{" "}
            <ArrowRight size={14} />
          </button>
        </div>

        {builder && (
          <div className="test-builder">
            <div className="question-config">
              <label>
                Examination
                <select
                  value={examId}
                  onChange={(e) => onExamChange(e.target.value)}
                >
                  <option value="">Select exam</option>
                  <ExamOptGroups
                    exams={exams}
                    getKey={(e) => e.id}
                    getValue={(e) => e.id}
                    getLabel={(e) => `${e.name} · ${e.status}`}
                  />
                </select>
              </label>

              <label>
                Stage
                <select
                  value={stageId}
                  onChange={(e) => onStageChange(e.target.value)}
                >
                  <option value="">Select stage</option>
                  {examId
                    ? stages.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.sections?.length ?? 0} sections ·{" "}
                          {Math.round((s.duration_seconds ?? 3600) / 60)} min
                        </option>
                      ))
                    : exams.map((e: any) => (
                        <optgroup key={e.id} label={e.name}>
                          {(e.stages ?? []).map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {e.name} — {s.name} (
                              {s.sections?.length ?? 0} sections ·{" "}
                              {Math.round((s.duration_seconds ?? 3600) / 60)} min)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                </select>
              </label>

              <label>
                Test name
                <select
                  value={testNameSelectValue}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomNameMode(true);
                      if (testNameGroups.all.includes(testName)) {
                        onSetTestName("");
                      }
                    } else {
                      setCustomNameMode(false);
                      onSetTestName(e.target.value);
                    }
                  }}
                >
                  <option value="">Select test name</option>
                  <optgroup
                    label={
                      selectedExam && stage
                        ? "Full-length & pattern mocks"
                        : "General mock templates"
                    }
                  >
                    {testNameGroups.series.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                  {testNameGroups.sectional.length > 0 && (
                    <optgroup label="Sectional mocks">
                      {testNameGroups.sectional.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {testNameGroups.existing.length > 0 && (
                    <optgroup label="Saved test names">
                      {testNameGroups.existing.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__custom__">Custom test name...</option>
                </select>
                {isCustomTestName && (
                  <input
                    className="custom-test-name-input"
                    type="text"
                    placeholder="Enter custom test name"
                    value={testName}
                    onChange={(e) => onSetTestName(e.target.value)}
                  />
                )}
              </label>
              <Field
                type="number"
                label="Duration (minutes)"
                value={String(duration)}
                onChange={(v) => onSetDuration(Number(v))}
              />
              <Field
                label="Description"
                value={description}
                onChange={onSetDescription}
              />
              <label>
                Available from (optional)
                <div className="datetime-input-row">
                  <input
                    type="datetime-local"
                    value={availabilityStart}
                    onChange={(e) => onSetAvailabilityStart(e.target.value)}
                  />
                  {availabilityStart && (
                    <button
                      type="button"
                      className="outline-btn admin-action"
                      onClick={() => onSetAvailabilityStart("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <label>
                Available until (optional)
                <div className="datetime-input-row">
                  <input
                    type="datetime-local"
                    min={availabilityStart || undefined}
                    value={availabilityEnd}
                    onChange={(e) => onSetAvailabilityEnd(e.target.value)}
                  />
                  {availabilityEnd && (
                    <button
                      type="button"
                      className="outline-btn admin-action"
                      onClick={() => onSetAvailabilityEnd("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>

              <label>
                Question selection
                <select
                  value={selectionMode}
                  onChange={(e) => onSetSelectionMode(e.target.value)}
                >
                  <option value="rule_based">
                    Automatic question selection (no repeats)
                  </option>
                  <option value="manual">Manual question selection</option>
                </select>
              </label>

              <label>
                Question review
                <select
                  value={reviewPolicy}
                  onChange={(e) => onSetReviewPolicy(e.target.value)}
                >
                  <option value="after_submit">
                    Allow review after submission
                  </option>
                  <option value="never">Hide answer review</option>
                </select>
              </label>
            </div>

            <>
              {selectionMode === "manual" ? (
                <div className="test-question-picker">
                  <strong>Published questions for this stage</strong>
                  <span>{selected.length} selected</span>
                  {eligibleQuestions.map((q) => (
                    <label key={q.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(q.id)}
                        onChange={(e) =>
                          onSetSelected((old) =>
                            e.target.checked
                              ? [...old, q.id]
                              : old.filter((id) => id !== q.id),
                          )
                        }
                      />
                      <span>
                        {q.section_name} · {q.topic_name}
                      </span>
                      <small>{q.question_text}</small>
                    </label>
                  ))}
                  {!eligibleQuestions.length && (
                    <p>No published questions match this exam stage yet.</p>
                  )}
                </div>
              ) : (
                <RuleBasedSelector
                  sections={stage?.sections ?? []}
                  questions={eligibleQuestions}
                  value={selectionRules}
                  onChange={onSetSelectionRules}
                />
              )}
            </>

            <div className="admin-footer">
              <span>
                {editingTestId
                  ? "Editing a draft updates its question selection. Tests with attempts cannot be changed."
                  : "Draft tests are not visible to students. Review exam pattern and question counts before publishing."}
              </span>
              <div>
                <button
                  className="outline-btn admin-action"
                  onClick={onResetTestBuilder}
                >
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={
                    busy ||
                    (selectionMode === "rule_based" && !selectionRulesValid)
                  }
                  onClick={onCreateTest}
                >
                  {editingTestId ? "Save changes" : "Save draft"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="section-table-wrap">
          <table className="section-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Examination</th>
                <th>Stage</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div>{t.name}</div>
                    {formatAvailabilityWindow(
                      t.availability_start,
                      t.availability_end,
                    ) && (
                      <small className="table-subtext">
                        {formatAvailabilityWindow(
                          t.availability_start,
                          t.availability_end,
                        )}
                      </small>
                    )}
                  </td>
                  <td>{t.exam_name}</td>
                  <td>{t.stage_name}</td>
                  <td>{t.question_count}</td>
                  <td>{Math.round(t.duration_seconds / 60)} min</td>
                  <td>{t.status}</td>
                  <td>
                    {t.status === "draft" && (
                      <button
                        className="outline-btn admin-action"
                        onClick={() => onEditTest(t)}
                      >
                        Edit
                      </button>
                    )}{" "}
                    <button
                      className="outline-btn admin-action"
                      disabled={t.status === "archived" || !t.question_count}
                      onClick={() =>
                        onChangeStatus(
                          t.id,
                          t.status === "published" ? "draft" : "published",
                        )
                      }
                    >
                      {t.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tests.length && !busy && (
          <div className="empty-questions">No mock tests have been created.</div>
        )}
      </section>
      <div className="admin-note">
        <FileQuestion size={16} />
        <span>Tests use only published questions from the selected exam stage.</span>
      </div>
    </>
  );
}
