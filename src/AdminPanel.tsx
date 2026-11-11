import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { ExamSetupView, type Exam, type Stage, type Section } from "./components/admin/ExamSetupView";
import {
  QuestionBankView,
  type Question,
  type QuestionForm,
} from "./components/admin/QuestionBankView";

const defaultExam = (name: string, code: string): Exam => ({
  id: "",
  name,
  code,
  category: "Other Banks / Institutions",
  description: "Pattern pending official verification.",
  pattern_cycle: null,
  pattern_source_url: null,
  pattern_verified_at: null,
  status: "draft",
  stages: [
    {
      name: "Stage 1 — configure after verification",
      duration_seconds: 3600,
      sort_order: 0,
      sections: [
        {
          id: "",
          name: "Section 1 — configure after verification",
          question_count: 0,
          duration_seconds: null,
          marks_per_correct: 1,
          negative_marks: 0,
          sort_order: 0,
        },
      ],
    },
  ],
});

const emptyForm = (): QuestionForm => ({
  sectionId: "",
  topicName: "",
  difficulty: "medium",
  questionType: "mcq",
  language: "English",
  questionText: "",
  imageUrl: "",
  passageGroupId: "",
  options: ["", "", "", ""],
  correctAnswer: "A",
  explanation: "",
  marks: "1",
  negativeMarks: "0.25",
  source: "",
  sourceYear: "",
  status: "draft",
});

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

function csvBase64(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

function SettingsIcon() {
  return <span aria-hidden="true">⚙</span>;
}

export default function AdminPanel({
  section,
  onToast,
  onNavigate,
}: {
  section: "Exam setup" | "Question bank";
  onToast: (message: string) => void;
  onNavigate: (section: "Exam setup" | "Question bank") => void;
}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<QuestionForm>(emptyForm());
  const [editId, setEditId] = useState("");
  const [preview, setPreview] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [confirmRows, setConfirmRows] = useState<number[]>([]);
  const [passageGroups, setPassageGroups] = useState<any[]>([]);
  const [newPassage, setNewPassage] = useState({
    title: "",
    text: "",
    language: "English",
    imageUrl: "",
  });
  const [showNewPassage, setShowNewPassage] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const exam = exams[examIndex];
  const stage = exam?.stages[stageIndex];

  const visibleQuestions = questions.filter((q) =>
    `${q.exam_name} ${q.section_name} ${q.topic_name} ${q.question_text}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );

  async function loadExams() {
    const result = await api("/exams");
    setExams(result.exams);
  }

  async function loadQuestions() {
    const result = await api("/admin/questions");
    setQuestions(result.questions);
  }

  useEffect(() => {
    setBusy(true);
    Promise.all([
      loadExams(),
      section === "Question bank" ? loadQuestions() : Promise.resolve(),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [section]);

  useEffect(() => {
    if (stage?.sections?.[0]?.id && !form.sectionId)
      setForm((v) => ({ ...v, sectionId: stage.sections[0].id }));
  }, [stage]);

  useEffect(() => {
    if (form.questionType !== "passage" || !form.sectionId) {
      setPassageGroups([]);
      return;
    }
    let active = true;
    api(`/admin/passage-groups?sectionId=${form.sectionId}`)
      .then((result) => {
        if (active) setPassageGroups(result.passageGroups);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [form.questionType, form.sectionId]);

  function updateExam(mutator: (current: Exam) => Exam) {
    setExams((current) =>
      current.map((item, index) =>
        index === examIndex ? mutator(item) : item,
      ),
    );
  }

  function setStage(field: keyof Stage, value: string) {
    if (!exam) return;
    updateExam((current) => ({
      ...current,
      stages: current.stages.map((item, index) =>
        index === stageIndex
          ? { ...item, [field]: field === "name" ? value : Number(value) }
          : item,
      ),
    }));
  }

  function setSection(i: number, field: keyof Section, value: string) {
    updateExam((current) => ({
      ...current,
      stages: current.stages.map((s, si) =>
        si !== stageIndex
          ? s
          : {
              ...s,
              sections: s.sections.map((item, ix) =>
                ix === i
                  ? {
                      ...item,
                      [field]: field === "name" ? value : Number(value),
                    }
                  : item,
              ),
            },
      ),
    }));
  }

  async function createExam() {
    if (!newName.trim()) return;
    const code = newName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28);
    setBusy(true);
    try {
      const draft = defaultExam(newName.trim(), code);
      const created = await api("/admin/exams", {
        method: "POST",
        body: JSON.stringify({
          code: draft.code,
          name: draft.name,
          description: "",
          status: "draft",
          stages: draft.stages.map((s, si) => ({
            name: s.name,
            durationSeconds: s.duration_seconds,
            sortOrder: si,
            sections: s.sections.map((x, ix) => ({
              name: x.name,
              questionCount: x.question_count,
              durationSeconds: x.duration_seconds,
              marksPerCorrect: x.marks_per_correct,
              negativeMarks: x.negative_marks,
              sortOrder: ix,
            })),
          })),
        }),
      });
      await loadExams();
      const idx = (await api("/exams")).exams.findIndex(
        (x: Exam) => x.id === created.exam.id,
      );
      setExamIndex(Math.max(0, idx));
      setStageIndex(0);
      setShowNew(false);
      setNewName("");
      onToast(
        "Exam created in the database. Review its pattern before publishing.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function savePattern() {
    if (!exam) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        code: exam.code,
        name: exam.name,
        category: exam.category || "Other Banks / Institutions",
        description: exam.description,
        patternCycle: exam.pattern_cycle || null,
        patternSourceUrl: exam.pattern_source_url || null,
        status: exam.status,
        stages: exam.stages.map((s, si) => ({
          id: s.id || undefined,
          name: s.name,
          durationSeconds: Number(s.duration_seconds),
          sortOrder: si,
          sections: s.sections.map((x, ix) => ({
            id: x.id || undefined,
            name: x.name,
            questionCount: Number(x.question_count),
            durationSeconds: x.duration_seconds
              ? Number(x.duration_seconds)
              : null,
            marksPerCorrect: Number(x.marks_per_correct),
            negativeMarks: Number(x.negative_marks),
            sortOrder: ix,
          })),
        })),
      };
      await api(`/admin/exams/${exam.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      await loadExams();
      onToast("Exam pattern saved to PostgreSQL.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function addSection() {
    if (!exam) return;
    updateExam((e) => ({
      ...e,
      stages: e.stages.map((s, si) =>
        si !== stageIndex
          ? s
          : {
              ...s,
              sections: [
                ...s.sections,
                {
                  id: "",
                  name: "New section",
                  question_count: 0,
                  duration_seconds: null,
                  marks_per_correct: 1,
                  negative_marks: 0,
                  sort_order: s.sections.length,
                },
              ],
            },
      ),
    }));
  }

  function addStage() {
    if (!exam) return;
    updateExam((e) => ({
      ...e,
      stages: [
        ...e.stages,
        {
          name: `Stage ${e.stages.length + 1}`,
          duration_seconds: 7200,
          sort_order: e.stages.length,
          sections: [
            {
              id: "",
              name: "New section",
              question_count: 0,
              duration_seconds: null,
              marks_per_correct: 1,
              negative_marks: 0,
              sort_order: 0,
            },
          ],
        },
      ],
    }));
    setStageIndex(exam.stages.length);
  }

  async function createPassageGroup() {
    if (
      !form.sectionId ||
      !newPassage.title.trim() ||
      newPassage.text.trim().length < 20
    ) {
      setError(
        "Choose a section and enter a passage title and at least 20 characters of text.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api("/admin/passage-groups", {
        method: "POST",
        body: JSON.stringify({
          sectionId: form.sectionId,
          title: newPassage.title,
          passageText: newPassage.text,
          language: newPassage.language,
          imageUrl: newPassage.imageUrl.trim() || null,
        }),
      });
      setPassageGroups((old) => [...old, result.passageGroup]);
      setForm((v) => ({ ...v, passageGroupId: result.passageGroup.id }));
      setNewPassage({ title: "", text: "", language: "English", imageUrl: "" });
      setShowNewPassage(false);
      onToast(
        "Passage group saved. Add its questions and select this group for each one.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestion(status: "draft" | "published") {
    if (!form.sectionId) {
      setError("Choose an exam section first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        sectionId: form.sectionId,
        topicName: form.topicName,
        difficulty: form.difficulty,
        questionType: form.questionType,
        language: form.language,
        questionText: form.questionText,
        imageUrl: form.imageUrl.trim() || null,
        passageGroupId:
          form.questionType === "passage" ? form.passageGroupId || null : null,
        options:
          form.questionType === "descriptive"
            ? []
            : form.options.map((text, index) => ({
                key: String.fromCharCode(65 + index),
                text,
              })),
        correctAnswer:
          form.questionType === "descriptive" ? "" : form.correctAnswer,
        explanation: form.explanation,
        marks: Number(form.marks),
        negativeMarks: Number(form.negativeMarks),
        source: form.source,
        sourceYear: form.sourceYear ? Number(form.sourceYear) : null,
        status,
      };
      const saved = await api(`/admin/questions${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setForm(emptyForm());
      setEditId("");
      setPreview(false);
      await loadQuestions();
      const synced = (saved?.syncedTests ?? []).filter((s: any) => s.synced);
      onToast(
        synced.length
          ? `Question ${editId ? "updated" : "published"}. Student Mock Tests updated (${synced.map((s: any) => `${s.examName} ${s.stageName}`).join(", ")}).`
          : `Question ${editId ? "updated" : "saved"} to PostgreSQL as ${status}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function editQuestion(q: Question) {
    setEditId(q.id);
    setForm({
      sectionId: q.section_id,
      topicName: q.topic_name,
      difficulty: q.difficulty,
      questionType: q.question_type,
      language: q.language,
      questionText: q.question_text,
      imageUrl: q.image_url ?? "",
      passageGroupId: q.passage_group_id ?? "",
      options: ["A", "B", "C", "D"].map(
        (key) => q.options.find((o) => o.key === key)?.text ?? "",
      ),
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      marks: String(q.marks),
      negativeMarks: String(q.negative_marks),
      source: q.source ?? "",
      sourceYear: q.source_year ? String(q.source_year) : "",
      status: q.status as "draft" | "published",
    });
    setPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function duplicateQuestion(q: Question) {
    editQuestion({ ...q, id: "", status: "draft" });
    setEditId("");
    onToast("Question copied into the editor. Save it to create a duplicate.");
  }

  async function bulkQuestionStatus(
    status: "draft" | "published" | "archived",
  ) {
    if (!selectedQuestionIds.length) return;
    if (
      status === "archived" &&
      !confirm(`Archive ${selectedQuestionIds.length} selected questions?`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await api("/admin/questions/status", {
        method: "PATCH",
        body: JSON.stringify({ questionIds: selectedQuestionIds, status }),
      });
      setSelectedQuestionIds([]);
      await loadQuestions();
      const synced = (result?.syncedTests ?? []).filter((s: any) => s.synced);
      onToast(
        synced.length
          ? `${result.updated} questions moved to ${status}. Student Mock Tests synced (${synced.map((s: any) => `${s.examName} ${s.stageName}`).join(", ")}).`
          : `${result.updated} questions moved to ${status}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id: string) {
    if (
      !confirm(
        "Archive this question? It will no longer be available for new tests.",
      )
    )
      return;
    try {
      await api(`/admin/questions/${id}`, { method: "DELETE" });
      await loadQuestions();
      onToast("Question archived.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function previewUpload() {
    if (!uploadFile) return;
    setBusy(true);
    setError("");
    try {
      const data = csvBase64(await uploadFile.arrayBuffer());
      const result = await api("/admin/questions/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-File-Name": uploadFile.name,
        },
        body: JSON.stringify({ data }),
      });
      setUploadPreview(result);
      const invalid = new Set(result.errors.map((x: any) => x.rowNumber));
      setConfirmRows(
        Array.from({ length: result.total }, (_, i) => i + 2).filter(
          (n) => !invalid.has(n),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmUpload() {
    if (!uploadPreview) return;
    setBusy(true);
    try {
      const result = await api(
        `/admin/questions/import/${uploadPreview.batchId}/confirm`,
        { method: "POST", body: JSON.stringify({ rowNumbers: confirmRows }) },
      );
      const synced = (result?.syncedTests ?? []).filter((s: any) => s.synced);
      onToast(
        synced.length
          ? `${result.imported} questions uploaded & published. Student Mock Tests unlocked (${synced.map((s: any) => `${s.examName} ${s.stageName}`).join(", ")}) and Daily Challenge updated!`
          : `${result.imported} questions uploaded and published to the Question Bank.`,
      );
      setUploadPreview(null);
      setUploadFile(null);
      await loadQuestions();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-workspace">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> ADMIN CONTENT WORKSPACE
          </div>
          <h1>{section}</h1>
          <p className="subheading">
            Configure the exam and question data aspirants will use.
          </p>
        </div>
        <span className="local-badge">POSTGRESQL CONNECTED</span>
      </div>
      <div className="admin-tabs">
        <button
          className={section === "Exam setup" ? "selected" : ""}
          onClick={() => onNavigate("Exam setup")}
        >
          <SettingsIcon />
          Exam setup
        </button>
        <button
          className={section === "Question bank" ? "selected" : ""}
          onClick={() => onNavigate("Question bank")}
        >
          <BookOpen size={16} />
          Question bank <span>{questions.length}</span>
        </button>
      </div>

      {error && (
        <div className="admin-error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {busy && <div className="admin-loading">Working with the database…</div>}

      {section === "Exam setup" ? (
        <ExamSetupView
          exams={exams}
          examIndex={examIndex}
          stageIndex={stageIndex}
          showNew={showNew}
          newName={newName}
          busy={busy}
          onSetShowNew={setShowNew}
          onSetNewName={setNewName}
          onSetExamIndex={setExamIndex}
          onSetStageIndex={setStageIndex}
          onCreateExam={createExam}
          onSavePattern={savePattern}
          onAddSection={addSection}
          onAddStage={addStage}
          onUpdateExam={updateExam}
          onSetStage={setStage}
          onSetSection={setSection}
        />
      ) : (
        <QuestionBankView
          exams={exams}
          examIndex={examIndex}
          stageIndex={stageIndex}
          questions={questions}
          visibleQuestions={visibleQuestions}
          filter={filter}
          form={form}
          editId={editId}
          preview={preview}
          uploadFile={uploadFile}
          uploadPreview={uploadPreview}
          confirmRows={confirmRows}
          passageGroups={passageGroups}
          newPassage={newPassage}
          showNewPassage={showNewPassage}
          selectedQuestionIds={selectedQuestionIds}
          busy={busy}
          onSetExamIndex={setExamIndex}
          onSetStageIndex={setStageIndex}
          onSetFilter={setFilter}
          onSetForm={setForm}
          onSetPreview={setPreview}
          onSetUploadFile={setUploadFile}
          onSetUploadPreview={setUploadPreview}
          onSetNewPassage={setNewPassage}
          onSetShowNewPassage={setShowNewPassage}
          onSetSelectedQuestionIds={setSelectedQuestionIds}
          onPreviewUpload={previewUpload}
          onConfirmUpload={confirmUpload}
          onCreatePassageGroup={createPassageGroup}
          onSaveQuestion={saveQuestion}
          onEditQuestion={editQuestion}
          onDuplicateQuestion={duplicateQuestion}
          onBulkQuestionStatus={bulkQuestionStatus}
          onRemoveQuestion={removeQuestion}
        />
      )}

      <p className="admin-disclaimer">
        Admin access is enforced by the API. The local build uses PostgreSQL;
        only explicitly published content can appear in student workflows.
      </p>
    </div>
  );
}
