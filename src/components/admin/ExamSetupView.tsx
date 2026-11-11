import { Check, CirclePlus, Plus, Save } from "lucide-react";
import { Field } from "../common/Field";
import {
  EXAM_CATEGORIES,
  ExamOptGroups,
  groupExamsByCategory,
} from "../../utils/examCategories";

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
  category?: string;
  sort_order?: number;
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
            <div className="exam-directory-box">
              <div className="exam-directory-header">
                <strong>Master Exam Catalogue ({exams.length} total)</strong>
                <span>Click any exam below to inspect or edit its pattern</span>
              </div>
              <div className="exam-category-grid">
                {groupExamsByCategory(exams).map((group) => (
                  <div className="exam-category-block" key={group.category}>
                    <div className="exam-category-head">
                      <span>{group.category}</span>
                      <b>{group.exams.length}</b>
                    </div>
                    <div className="exam-chip-list">
                      {group.exams.map((item) => {
                        const globalIdx = exams.findIndex(
                          (x) => x.id === item.id,
                        );
                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={`exam-chip-btn ${
                              globalIdx === examIndex ? "active" : ""
                            } ${item.status}`}
                            onClick={() => {
                              onSetExamIndex(globalIdx);
                              onSetStageIndex(0);
                            }}
                            title={`Code: ${item.code} · Status: ${item.status}`}
                          >
                            <span>{item.name}</span>
                            <small>{item.status}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  <ExamOptGroups
                    exams={exams}
                    getKey={(e) => e.id}
                    getValue={(_e, i) => i}
                    getLabel={(e) => `${e.name} · ${e.status}`}
                  />
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
                  <label className="form-field">
                    Category
                    <select
                      value={exam.category ?? "Other Banks / Institutions"}
                      onChange={(e) =>
                        onUpdateExam((current) => ({
                          ...current,
                          category: e.target.value,
                        }))
                      }
                    >
                      {EXAM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    Published exams unlock student mock tests and topic
                    practice; all active exams appear in the student exam list.
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
