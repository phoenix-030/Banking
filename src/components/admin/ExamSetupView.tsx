import { Check, CirclePlus, Plus, Save } from "lucide-react";
import { Field } from "../common/Field";

export type Section = {
  id: string;
  name: string;
  question_count: number;
  duration_seconds: number | null;
  marks_per_correct: number;
  negative_marks: number;
  sort_order: number;
};

export type Stage = {
  id?: string;
  name: string;
  duration_seconds: number;
  sort_order: number;
  sections: Section[];
};

export type Exam = {
  id: string;
  code: string;
  name: string;
  description: string;
  pattern_cycle: string | null;
  pattern_source_url: string | null;
  pattern_verified_at: string | null;
  status: "draft" | "published" | "archived";
  stages: Stage[];
};

interface ExamSetupViewProps {
  exams: Exam[];
  examIndex: number;
  stageIndex: number;
  showNew: boolean;
  newName: string;
  busy: boolean;
  onSetShowNew: (show: boolean | ((v: boolean) => boolean)) => void;
  onSetNewName: (name: string) => void;
  onSetExamIndex: (idx: number) => void;
  onSetStageIndex: (idx: number) => void;
  onCreateExam: () => void;
  onSavePattern: () => void;
  onAddSection: () => void;
  onAddStage: () => void;
  onUpdateExam: (mutator: (current: Exam) => Exam) => void;
  onSetStage: (field: keyof Stage, value: string) => void;
  onSetSection: (i: number, field: keyof Section, value: string) => void;
}

export function ExamSetupView({
  exams,
  examIndex,
  stageIndex,
  showNew,
  newName,
  busy,
  onSetShowNew,
  onSetNewName,
  onSetExamIndex,
  onSetStageIndex,
  onCreateExam,
  onSavePattern,
  onAddSection,
  onAddStage,
  onUpdateExam,
  onSetStage,
  onSetSection,
}: ExamSetupViewProps) {
  const exam = exams[examIndex];
  const stage = exam?.stages[stageIndex];

  return (
    <>
      <section className="panel admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="section-kicker">DATABASE EXAM CATALOGUE</span>
            <h2>Examinations and stages</h2>
          </div>
          <button
            className="outline-btn admin-action"
            onClick={() => onSetShowNew((v) => !v)}
          >
            <CirclePlus size={15} /> Add examination
          </button>
        </div>

        {showNew && (
          <div className="inline-add">
            <input
              value={newName}
              onChange={(e) => onSetNewName(e.target.value)}
              placeholder="New examination name"
            />
            <button
              className="primary-btn"
              disabled={busy}
              onClick={onCreateExam}
            >
              Create
            </button>
          </div>
        )}

        {exams.length > 0 && (
          <>
            <div className="config-selectors">
              <label>
                Examination
                <select
                  value={examIndex}
                  onChange={(e) => {
                    onSetExamIndex(Number(e.target.value));
                    onSetStageIndex(0);
                  }}
                >
                  {exams.map((e, i) => (
                    <option value={i} key={e.id}>
                      {e.name} · {e.status}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Stage
                <select
                  value={stageIndex}
                  onChange={(e) => onSetStageIndex(Number(e.target.value))}
                >
                  {exam?.stages.map((s, i) => (
                    <option value={i} key={s.id ?? i}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {exam && stage && (
              <>
                <div className="config-fields">
                  <Field
                    label="Stage name"
                    value={stage.name}
                    onChange={(v) => onSetStage("name", v)}
                  />
                  <Field
                    label="Duration (seconds)"
                    type="number"
                    value={String(stage.duration_seconds)}
                    onChange={(v) => onSetStage("duration_seconds", v)}
                  />
                  <Field label="Exam code" value={exam.code} readOnly />
                </div>

                <div className="config-fields">
                  <Field
                    label="Pattern cycle (for example, CRP PO/MT-XV)"
                    value={exam.pattern_cycle ?? ""}
                    onChange={(v) =>
                      onUpdateExam((current) => ({
                        ...current,
                        pattern_cycle: v || null,
                      }))
                    }
                  />
                  <Field
                    label="Official notification URL (HTTPS)"
                    value={exam.pattern_source_url ?? ""}
                    onChange={(v) =>
                      onUpdateExam((current) => ({
                        ...current,
                        pattern_source_url: v || null,
                      }))
                    }
                  />
                </div>

                {exam.pattern_verified_at && (
                  <p className="pattern-verified-note">
                    Published pattern source recorded{" "}
                    {new Date(exam.pattern_verified_at).toLocaleDateString()}.
                  </p>
                )}

                <div className="exam-status-row">
                  <label>
                    Publication status
                    <select
                      value={exam.status}
                      onChange={(e) =>
                        onUpdateExam((current) => ({
                          ...current,
                          status: e.target.value as Exam["status"],
                        }))
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <span>
                    Only published exams appear in the student catalog.
                  </span>
                </div>

                <div className="section-table-wrap">
                  <table className="section-table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Questions</th>
                        <th>Section time (sec)</th>
                        <th>Marks / correct</th>
                        <th>Penalty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.sections.map((s, i) => (
                        <tr key={s.id || i}>
                          <td>
                            <input
                              value={s.name}
                              onChange={(e) =>
                                onSetSection(i, "name", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={s.question_count}
                              onChange={(e) =>
                                onSetSection(
                                  i,
                                  "question_count",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={s.duration_seconds ?? ""}
                              onChange={(e) =>
                                onSetSection(
                                  i,
                                  "duration_seconds",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step=".01"
                              min="0"
                              value={s.marks_per_correct}
                              onChange={(e) =>
                                onSetSection(
                                  i,
                                  "marks_per_correct",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step=".01"
                              min="0"
                              value={s.negative_marks}
                              onChange={(e) =>
                                onSetSection(
                                  i,
                                  "negative_marks",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="admin-footer">
                  <span>
                    These are editable pattern values; check the official notice
                    before publishing.
                  </span>
                  <div>
                    <button
                      className="outline-btn admin-action"
                      onClick={onAddSection}
                    >
                      <Plus size={14} /> Add section
                    </button>
                    <button
                      className="outline-btn admin-action"
                      onClick={onAddStage}
                    >
                      <Plus size={14} /> Add stage
                    </button>
                    <button
                      className="primary-btn"
                      disabled={busy}
                      onClick={onSavePattern}
                    >
                      <Save size={15} /> Save pattern
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!exams.length && !busy && (
          <div className="empty-questions">No exam configurations found.</div>
        )}
      </section>

      <div className="admin-note">
        <Check size={16} />
        <span>
          <strong>Next step:</strong> choose Question bank and create content
          linked to a saved section.
        </span>
      </div>
    </>
  );
}
