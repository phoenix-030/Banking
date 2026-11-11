import {  Check,  Copy,  FileQuestion,  FileSpreadsheet,  Save,  Search,  Trash2,
} from "lucide-react";
import { Field } from "../common/Field";
import type { Exam } from "./ExamSetupView";
import {
  ExamOptGroups,
  groupExamsByCategory,
} from "../../utils/examCategories";

export type Question = {
  id: string;
  exam_name: string;
  stage_name: string;
  section_id: string;
  section_name: string;
  topic_name: string;
  difficulty: string;
  question_type: string;
  language: string;
  question_text: string;
  image_url: string | null;
  passage_group_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  passage_language: string | null;
  passage_image_url: string | null;
  options: { key: string; text: string }[];
  correct_answer: string;
  explanation: string;
  marks: number;
  negative_marks: number;
  source: string;
  source_year: number | null;
  status: "draft" | "published" | "archived";
};

export type QuestionForm = {
  sectionId: string;
  topicName: string;
  difficulty: string;
  questionType: string;
  language: string;
  questionText: string;
  imageUrl: string;
  passageGroupId: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: string;
  negativeMarks: string;
  source: string;
  sourceYear: string;
  status: "draft" | "published";
};

interface QuestionBankViewProps {
  exams: Exam[];
  examIndex: number;
  stageIndex: number;
  questions: Question[];
  visibleQuestions: Question[];
  filter: string;
  form: QuestionForm;
  editId: string;
  preview: boolean;
  uploadFile: File | null;
  uploadPreview: any;
  confirmRows: number[];
  passageGroups: any[];
  newPassage: {
    title: string;
    text: string;
    language: string;
    imageUrl: string;
  };
  showNewPassage: boolean;
  selectedQuestionIds: string[];
  busy: boolean;
  onSetExamIndex: (idx: number) => void;
  onSetStageIndex: (idx: number) => void;
  onSetFilter: (filter: string) => void;
  onSetForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  onSetPreview: (preview: boolean | ((v: boolean) => boolean)) => void;
  onSetUploadFile: (file: File | null) => void;
  onSetUploadPreview: (preview: any) => void;
  onSetNewPassage: React.Dispatch<
    React.SetStateAction<{
      title: string;
      text: string;
      language: string;
      imageUrl: string;
    }>
  >;
  onSetShowNewPassage: (show: boolean | ((v: boolean) => boolean)) => void;
  onSetSelectedQuestionIds: React.Dispatch<React.SetStateAction<string[]>>;
  onPreviewUpload: () => void;
  onConfirmUpload: () => void;
  onCreatePassageGroup: () => void;
  onSaveQuestion: (status: "draft" | "published") => void;
  onEditQuestion: (q: Question) => void;
  onDuplicateQuestion: (q: Question) => void;
  onBulkQuestionStatus: (status: "draft" | "published" | "archived") => void;
  onRemoveQuestion: (id: string) => void;
}

export function QuestionBankView({
  exams,
  examIndex,
  stageIndex,
  questions,
  visibleQuestions,
  filter,
  form,
  editId,
  preview,
  uploadFile,
  uploadPreview,
  confirmRows,
  passageGroups,
  newPassage,
  showNewPassage,
  selectedQuestionIds,
  busy,
  onSetExamIndex,
  onSetStageIndex,
  onSetFilter,
  onSetForm,
  onSetPreview,
  onSetUploadFile,
  onSetUploadPreview,
  onSetNewPassage,
  onSetShowNewPassage,
  onSetSelectedQuestionIds,
  onPreviewUpload,
  onConfirmUpload,
  onCreatePassageGroup,
  onSaveQuestion,
  onEditQuestion,
  onDuplicateQuestion,
  onBulkQuestionStatus,
  onRemoveQuestion,
}: QuestionBankViewProps) {
  const exam = exams[examIndex];
  const stage = exam?.stages[stageIndex];
  const stagePublishedCount = questions.filter(
    (q) =>
      q.exam_name === exam?.name &&
      q.stage_name === stage?.name &&
      q.status === "published",
  ).length;
  const minRequired = Number(uploadPreview?.minimumRequired ?? 20);
  const meetsMinimumUpload = confirmRows.length >= minRequired;

  return (
    <>
      <section className="panel admin-panel import-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="section-kicker">BULK QUESTION UPLOAD</span>
            <h2>
              <FileSpreadsheet size={17} /> CSV or Excel import (Min 20 questions)
            </h2>
          </div>
          <a
            className="outline-btn admin-action"
            href="/api/admin/questions/import/template.csv"
          >
            Download template
          </a>
        </div>
        <div className="import-controls">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              onSetUploadFile(e.target.files?.[0] ?? null);
              onSetUploadPreview(null);
            }}
          />
          <button
            className="outline-btn admin-action"
            disabled={!uploadFile || busy}
            onClick={onPreviewUpload}
          >
            Validate upload
          </button>
        </div>
        {exams.length > 0 && (
          <details className="supported-codes-hint">
            <summary>
              Supported <code>exam_code</code> values ({exams.length} exams across{" "}
              {groupExamsByCategory(exams).length} categories)
            </summary>
            <div className="supported-codes-grid">
              {groupExamsByCategory(exams).map((group) => (
                <div key={group.category}>
                  <strong>{group.category}</strong>
                  <span>
                    {group.exams.map((item) => `${item.code} (${item.name})`).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
        {uploadPreview && (
          <div className="upload-results">
            <div>
              <b>{uploadPreview.total}</b>
              <span>Total</span>
            </div>
            <div>
              <b>{uploadPreview.successful}</b>
              <span>Valid</span>
            </div>
            <div>
              <b>{uploadPreview.failed}</b>
              <span>Failed</span>
            </div>
            <div>
              <b>{uploadPreview.duplicate}</b>
              <span>Duplicates</span>
            </div>
            <button
              className="primary-btn"
              disabled={!meetsMinimumUpload || busy}
              onClick={onConfirmUpload}
            >
              {meetsMinimumUpload
                ? `Upload & publish ${confirmRows.length} questions to Mock Tests`
                : `Minimum ${minRequired} valid questions required (${confirmRows.length}/${minRequired})`}
            </button>
            {!meetsMinimumUpload && (
              <div className="min-upload-warning" role="alert">
                At least <strong>{minRequired} valid questions</strong> are
                required to upload to the Question Bank and publish to Student
                Mock Tests (currently {confirmRows.length} valid — add{" "}
                {minRequired - confirmRows.length} more).
              </div>
            )}
            {uploadPreview.errors.length > 0 && (
              <>
                <a
                  className="outline-btn admin-action"
                  href={`/api/admin/questions/import/${uploadPreview.batchId}/errors.csv`}
                >
                  Download row error report
                </a>
                <details>
                  <summary>Row errors</summary>
                  {uploadPreview.errors.map((x: any) => (
                    <p key={x.rowNumber}>
                      Row {x.rowNumber}: {x.errors.join("; ")}
                    </p>
                  ))}
                </details>
              </>
            )}
          </div>
        )}
      </section>

      <div className="question-bank-layout">
        <section className="panel admin-panel question-editor">
          <div className="admin-panel-heading">
            <div>
              <span className="section-kicker">CONTENT AUTHORING</span>
              <h2>
                <FileQuestion size={18} />{" "}
                {editId ? "Edit question" : "Add a question"}
              </h2>
            </div>
          </div>
          {exam && stage && (
            <div
              className={`stage-readiness-bar ${stagePublishedCount >= 20 ? "ready" : ""}`}
              role="status"
            >
              <strong>
                {exam.name} · {stage.name}
              </strong>
              <span>
                {stagePublishedCount >= 20
                  ? `${stagePublishedCount} published questions · Active in Student Mock Tests & Daily Challenge`
                  : `${stagePublishedCount} / 20 published questions · Add ${20 - stagePublishedCount} more to unlock Student Mock Tests`}
              </span>
            </div>
          )}
          {exam && exam.status !== "published" && (
            <div className="admin-notice" role="status">
              <strong>{exam.name}</strong> is currently in{" "}
              <strong>{exam.status}</strong> status. Uploading or publishing{" "}
              <strong>20+ questions</strong> will automatically activate it in
              Student Mock Tests, Practice, and Daily Challenge.
            </div>
          )}
          <div className="question-config">
            <label>
              Exam
              <select
                value={examIndex}
                onChange={(e) => {
                  onSetExamIndex(Number(e.target.value));
                  onSetStageIndex(0);
                  onSetForm((v) => ({
                    ...v,
                    sectionId: "",
                    passageGroupId: "",
                  }));
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
                onChange={(e) => {
                  onSetStageIndex(Number(e.target.value));
                  onSetForm((v) => ({
                    ...v,
                    sectionId: "",
                    passageGroupId: "",
                  }));
                }}
              >
                {exam?.stages.map((s, i) => (
                  <option value={i} key={s.id ?? i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Section
              <select
                value={form.sectionId}
                onChange={(e) =>
                  onSetForm({
                    ...form,
                    sectionId: e.target.value,
                    passageGroupId: "",
                  })
                }
              >
                <option value="">Choose section</option>
                {stage?.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Topic"
              value={form.topicName}
              placeholder="e.g. Syllogism"
              onChange={(v) => onSetForm({ ...form, topicName: v })}
            />
            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(e) =>
                  onSetForm({ ...form, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Question type
              <select
                value={form.questionType}
                onChange={(e) => {
                  const questionType = e.target.value;
                  onSetForm({
                    ...form,
                    questionType,
                    options:
                      questionType === "descriptive"
                        ? []
                        : form.options.length
                          ? form.options
                          : ["", "", "", ""],
                    correctAnswer:
                      questionType === "descriptive"
                        ? ""
                        : form.correctAnswer || "A",
                  });
                }}
              >
                <option value="mcq">Multiple choice</option>
                <option value="passage">Passage group</option>
                <option value="image">Image based</option>
                <option value="numeric">Numeric multiple choice</option>
                <option value="descriptive">Descriptive response</option>
              </select>
            </label>
            <label>
              Language
              <select
                value={form.language}
                onChange={(e) =>
                  onSetForm({ ...form, language: e.target.value })
                }
              >
                <option>English</option>
                <option>Hindi</option>
              </select>
            </label>
            <Field
              label="Source year (optional)"
              type="number"
              value={form.sourceYear}
              onChange={(v) => onSetForm({ ...form, sourceYear: v })}
            />
            <Field
              label="Source (optional)"
              value={form.source}
              onChange={(v) => onSetForm({ ...form, source: v })}
            />
          </div>

          {form.questionType === "passage" && (
            <div className="passage-group-editor">
              <label className="form-field">
                Passage group
                <select
                  value={form.passageGroupId}
                  onChange={(e) =>
                    onSetForm((v) => ({
                      ...v,
                      passageGroupId: e.target.value,
                    }))
                  }
                >
                  <option value="">Choose a passage group</option>
                  {passageGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title} · {group.language}
                    </option>
                  ))}
                </select>
              </label>
              {passageGroups.find(
                (group) => group.id === form.passageGroupId,
              ) && (
                <article className="passage-excerpt">
                  <strong>
                    {
                      passageGroups.find(
                        (group) => group.id === form.passageGroupId,
                      ).title
                    }
                  </strong>
                  <p>
                    {
                      passageGroups.find(
                        (group) => group.id === form.passageGroupId,
                      ).passage_text
                    }
                  </p>
                  {passageGroups.find(
                    (group) => group.id === form.passageGroupId,
                  ).image_url && (
                    <img
                      src={
                        passageGroups.find(
                          (group) => group.id === form.passageGroupId,
                        ).image_url
                      }
                      alt="Passage illustration"
                    />
                  )}
                </article>
              )}
              <button
                type="button"
                className="outline-btn admin-action"
                onClick={() => onSetShowNewPassage((value) => !value)}
              >
                {showNewPassage ? "Cancel new passage" : "Create passage group"}
              </button>
              {showNewPassage && (
                <div className="passage-create-form">
                  <Field
                    label="Passage title"
                    value={newPassage.title}
                    onChange={(v) =>
                      onSetNewPassage((old) => ({ ...old, title: v }))
                    }
                  />
                  <Field
                    label="Language"
                    value={newPassage.language}
                    onChange={(v) =>
                      onSetNewPassage((old) => ({ ...old, language: v }))
                    }
                  />
                  <Field
                    label="Passage image URL (optional, HTTPS)"
                    value={newPassage.imageUrl}
                    placeholder="https://..."
                    onChange={(v) =>
                      onSetNewPassage((old) => ({ ...old, imageUrl: v }))
                    }
                  />
                  <label className="form-field">
                    Shared passage text
                    <textarea
                      rows={6}
                      value={newPassage.text}
                      onChange={(e) =>
                        onSetNewPassage((old) => ({
                          ...old,
                          text: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={busy}
                    onClick={onCreatePassageGroup}
                  >
                    Save passage group
                  </button>
                </div>
              )}
            </div>
          )}

          {form.questionType === "image" && (
            <Field
              label="Image URL (HTTPS)"
              value={form.imageUrl}
              placeholder="https://..."
              onChange={(v) => onSetForm({ ...form, imageUrl: v })}
            />
          )}

          <label className="form-field">
            Question text
            <textarea
              rows={4}
              value={form.questionText}
              onChange={(e) =>
                onSetForm({ ...form, questionText: e.target.value })
              }
              placeholder="Enter the question text."
            />
          </label>

          {form.questionType !== "descriptive" && (
            <div className="option-editor">
              <div className="form-label">
                Options — select the letter for the correct answer
              </div>
              {form.options.map((option, i) => {
                const key = String.fromCharCode(65 + i);
                return (
                  <div
                    className={`option-input ${form.correctAnswer === key ? "correct-option" : ""}`}
                    key={key}
                  >
                    <button
                      type="button"
                      onClick={() => onSetForm({ ...form, correctAnswer: key })}
                    >
                      {key}
                    </button>
                    <input
                      value={option}
                      onChange={(e) =>
                        onSetForm({
                          ...form,
                          options: form.options.map((v, index) =>
                            index === i ? e.target.value : v,
                          ),
                        })
                      }
                      placeholder={`Option ${key}`}
                    />
                    {form.correctAnswer === key && <Check size={15} />}
                  </div>
                );
              })}
            </div>
          )}

          <label className="form-field">
            {form.questionType === "descriptive"
              ? "Grading rubric / evaluation guidance"
              : "Answer explanation"}
            <textarea
              rows={3}
              value={form.explanation}
              onChange={(e) =>
                onSetForm({ ...form, explanation: e.target.value })
              }
              placeholder="Explain the solution for aspirants."
            />
          </label>

          <div className="config-fields scoring-fields">
            <Field
              label="Marks"
              type="number"
              value={form.marks}
              onChange={(v) => onSetForm({ ...form, marks: v })}
            />
            <Field
              label="Negative marks"
              type="number"
              value={form.negativeMarks}
              onChange={(v) => onSetForm({ ...form, negativeMarks: v })}
            />
          </div>

          <div className="question-preview-control">
            <button
              className="outline-btn admin-action"
              onClick={() => onSetPreview((v) => !v)}
            >
              Preview question
            </button>
            {preview && (
              <div className="question-preview">
                <span>
                  {exam?.name} · {stage?.name} · {form.topicName || "Topic"} ·{" "}
                  {form.difficulty}
                </span>
                {form.questionType === "passage" &&
                  passageGroups.find(
                    (group) => group.id === form.passageGroupId,
                  ) && (
                    <div className="preview-passage">
                      <strong>
                        {
                          passageGroups.find(
                            (group) => group.id === form.passageGroupId,
                          ).title
                        }
                      </strong>
                      <p>
                        {
                          passageGroups.find(
                            (group) => group.id === form.passageGroupId,
                          ).passage_text
                        }
                      </p>
                    </div>
                  )}
                <p>
                  {form.questionText || "Question preview will appear here."}
                </p>
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt="Question illustration preview"
                  />
                )}
                {form.questionType === "descriptive" ? (
                  <div>
                    Descriptive written response · evaluated using the rubric
                  </div>
                ) : (
                  <>
                    {form.options.map((o, i) => (
                      <div key={i}>
                        {String.fromCharCode(65 + i)}. {o || "Option text"}
                      </div>
                    ))}
                    <strong>Answer: {form.correctAnswer}</strong>
                  </>
                )}
                <p>{form.explanation}</p>
              </div>
            )}
          </div>

          <div className="admin-footer question-submit">
            <span>
              Questions are stored on the server; drafts are excluded from
              student tests.
            </span>
            <div>
              <button
                className="outline-btn admin-action"
                disabled={busy}
                onClick={() => onSaveQuestion("draft")}
              >
                Save draft
              </button>
              <button
                className="primary-btn"
                disabled={busy}
                onClick={() => onSaveQuestion("published")}
              >
                <Check size={15} /> Publish question
              </button>
            </div>
          </div>
        </section>

        <section className="panel admin-panel saved-questions">
          <div className="admin-panel-heading">
            <div>
              <span className="section-kicker">QUESTION BANK</span>
              <h2>
                Saved questions{" "}
                <span className="question-count">{questions.length}</span>
              </h2>
            </div>
            <label className="question-search">
              <Search size={15} />
              <input
                value={filter}
                onChange={(e) => onSetFilter(e.target.value)}
                placeholder="Search questions"
              />
            </label>
          </div>

          {selectedQuestionIds.length > 0 && (
            <div className="bulk-question-actions">
              <strong>{selectedQuestionIds.length} selected</strong>
              <button
                className="outline-btn admin-action"
                disabled={busy}
                onClick={() => void onBulkQuestionStatus("draft")}
              >
                Return to drafts
              </button>
              <button
                className="primary-btn"
                disabled={busy}
                onClick={() => void onBulkQuestionStatus("published")}
              >
                Publish selected
              </button>
              <button
                className="outline-btn admin-action"
                disabled={busy}
                onClick={() => void onBulkQuestionStatus("archived")}
              >
                Archive selected
              </button>
              <button
                className="text-link"
                onClick={() => onSetSelectedQuestionIds([])}
              >
                Clear selection
              </button>
            </div>
          )}

          {visibleQuestions.length ? (
            <div className="saved-question-list">
              {visibleQuestions.map((q) => (
                <article className="saved-question" key={q.id}>
                  <div className="saved-question-meta">
                    <label className="question-select">
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={(e) =>
                          onSetSelectedQuestionIds((old) =>
                            e.target.checked
                              ? [...old, q.id]
                              : old.filter((id) => id !== q.id),
                          )
                        }
                      />
                      <span>Select</span>
                    </label>
                    <span>{q.exam_name}</span>
                    <span>
                      {q.stage_name} · {q.section_name}
                    </span>
                    <span>{q.topic_name}</span>
                    {q.passage_title && <span>{q.passage_title}</span>}
                    <b className={q.status === "published" ? "published" : ""}>
                      {q.status}
                    </b>
                  </div>
                  <p>{q.question_text}</p>
                  {q.image_url && (
                    <img
                      className="saved-question-image"
                      src={q.image_url}
                      alt="Question illustration"
                      loading="lazy"
                    />
                  )}
                  <div className="saved-question-bottom">
                    <span>
                      {q.difficulty} · {q.marks} marks · −{q.negative_marks} ·{" "}
                      {q.language}
                    </span>
                    <div>
                      <button
                        className="icon-btn"
                        aria-label="Edit question"
                        onClick={() => onEditQuestion(q)}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Duplicate question"
                        onClick={() => onDuplicateQuestion(q)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Archive question"
                        onClick={() => onRemoveQuestion(q.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-questions">
              <div>
                <FileQuestion size={22} />
              </div>
              <strong>No questions yet</strong>
              <span>Enter a question or validate a CSV/XLSX import.</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
