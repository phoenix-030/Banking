import { useEffect, useState } from "react";
import { AdminDashboardOverview } from "./components/admin/AdminDashboardOverview";
import { StudentManagementView } from "./components/admin/StudentManagementView";
import { MockTestBuilderView } from "./components/admin/MockTestBuilderView";
import { CurrentAffairsView } from "./components/admin/CurrentAffairsView";
import { AttemptReportsView } from "./components/admin/AttemptReportsView";
import { AuditLogsView } from "./components/admin/AuditLogsView";

const api = async (path: string, init?: RequestInit) => {
  const r = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const d = r.status === 204 ? null : await r.json();
  if (!r.ok) throw new Error(d?.error ?? "Request failed.");
  return d;
};

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildDefaultRules(selectedStage: any) {
  return (selectedStage?.sections ?? []).map((sec: any) => ({
    sectionId: sec.id,
    topicDistribution: [],
    easyPercent: 30,
    mediumPercent: 50,
    hardPercent: 20,
  }));
}

export default function AdminOverview({
  section,
  onNavigate,
  onToast,
}: {
  section: string;
  onNavigate: (page: string) => void;
  onToast: (msg: string) => void;
}) {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [affairs, setAffairs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [descriptiveResponses, setDescriptiveResponses] = useState<any[]>([]);
  const [gradingDrafts, setGradingDrafts] = useState<
    Record<string, { score: string; comment: string }>
  >({});
  const [logs, setLogs] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Test builder state
  const [builder, setBuilder] = useState(false);
  const [editingTestId, setEditingTestId] = useState("");
  const [examId, setExamId] = useState("");
  const [stageId, setStageId] = useState("");
  const [testName, setTestName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [reviewPolicy, setReviewPolicy] = useState("after_submit");
  const [selectionMode, setSelectionMode] = useState("rule_based");
  const [selectionRules, setSelectionRules] = useState<any[]>([]);
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // Current affairs state
  const [article, setArticle] = useState({
    id: "",
    categoryId: "",
    title: "",
    body: "",
    status: "draft",
  });
  const [quiz, setQuiz] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "A",
    explanation: "",
  });

  useEffect(() => {
    setBusy(true);
    setError("");
    let task: Promise<any>;

    if (section === "Admin dashboard") {
      task = api("/admin/overview").then((d) => {
        setStats(d.stats);
        setActivity(d.activity);
      });
    } else if (section === "Students") {
      task = api(`/admin/students?search=${encodeURIComponent(search)}`).then(
        (d) => setStudents(d.students),
      );
    } else if (section === "Mock tests") {
      task = Promise.all([
        api("/admin/tests"),
        api("/exams"),
        api("/admin/questions?status=published"),
      ]).then(([t, e, q]) => {
        setTests(t.tests);
        setExams(e.exams);
        setQuestions(q.questions);
      });
    } else if (section === "Current affairs") {
      task = api("/admin/current-affairs").then((d) => {
        setCategories(d.categories);
        setAffairs(d.items);
        if (!article.categoryId && d.categories[0]) {
          setArticle((a) => ({ ...a, categoryId: d.categories[0].id }));
        }
      });
    } else if (section === "Reports") {
      task = Promise.all([
        api("/admin/reports/attempts"),
        api("/admin/descriptive-responses"),
      ]).then(([d, g]) => {
        setReports(d.attempts);
        setDescriptiveResponses(g.responses);
        setGradingDrafts(
          Object.fromEntries(
            g.responses.map((r: any) => [
              `${r.practice_session_id ?? r.attempt_id}:${r.question_id}`,
              { score: "", comment: "" },
            ]),
          ),
        );
      });
    } else if (section === "Settings") {
      task = api("/admin/audit-logs").then((d) => setLogs(d.logs));
    } else {
      task = Promise.resolve();
    }

    task.catch((e) => setError(e.message)).finally(() => setBusy(false));
  }, [section, search]);

  const updateStudent = async (id: string, input: object) => {
    try {
      await api(`/admin/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      const d = await api(`/admin/students?search=${encodeURIComponent(search)}`);
      setStudents(d.students);
      onToast("Student account updated.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  function resetTestBuilder() {
    setEditingTestId("");
    setExamId("");
    setStageId("");
    setTestName("");
    setDescription("");
    setDuration(60);
    setReviewPolicy("after_submit");
    setSelectionMode("rule_based");
    setSelectionRules([]);
    setAvailabilityStart("");
    setAvailabilityEnd("");
    setSelected([]);
    setBuilder(false);
  }

  function applyExamAndStage(nextExamId: string, preferredStageId?: string) {
    const nextExam = exams.find((item: any) => item.id === nextExamId);
    const nextStage = preferredStageId
      ? (nextExam?.stages ?? []).find((s: any) => s.id === preferredStageId)
      : (nextExam?.stages ?? [])[0];
    setExamId(nextExam?.id ?? "");
    setStageId(nextStage?.id ?? "");
    setSelectionRules(buildDefaultRules(nextStage));
    setSelected([]);
    setDuration(
      nextStage?.duration_seconds
        ? Math.round(nextStage.duration_seconds / 60)
        : 60,
    );
    if (
      !editingTestId &&
      (nextExamId !== examId || (nextStage?.id ?? "") !== stageId)
    ) {
      setTestName("");
    }
  }

  function editTest(t: any) {
    setEditingTestId(t.id);
    setExamId(t.exam_id);
    setStageId(t.stage_id);
    setTestName(t.name);
    setDescription(t.description ?? "");
    setDuration(Math.round(t.duration_seconds / 60));
    setReviewPolicy(t.review_policy);
    setSelectionMode(
      t.selection_mode === "rule_based" && t.selection_rules?.length
        ? "rule_based"
        : "manual",
    );
    setSelectionRules(t.selection_rules ?? []);
    setAvailabilityStart(toLocalDateTimeInput(t.availability_start));
    setAvailabilityEnd(toLocalDateTimeInput(t.availability_end));
    setSelected(t.question_ids ?? []);
    setBuilder(true);
    setError("");
  }

  async function createTest() {
    if (
      !examId ||
      !stageId ||
      !testName.trim() ||
      (selectionMode === "manual" && !selected.length)
    ) {
      setError(
        "Choose an exam, stage, test name, and the required question selection.",
      );
      return;
    }
    if (
      availabilityStart &&
      availabilityEnd &&
      new Date(availabilityEnd) <= new Date(availabilityStart)
    ) {
      setError("Available until must be later than Available from.");
      return;
    }
    setBusy(true);
    try {
      const input = {
        examId,
        stageId,
        name: testName.trim(),
        description,
        durationSeconds: duration * 60,
        reviewPolicy,
        selectionMode,
        questionIds: selectionMode === "manual" ? selected : [],
        selectionRules: selectionMode === "rule_based" ? selectionRules : [],
        availabilityStart: toIsoOrNull(availabilityStart),
        availabilityEnd: toIsoOrNull(availabilityEnd),
        status: "draft",
      };
      await api(editingTestId ? `/admin/tests/${editingTestId}` : "/admin/tests", {
        method: editingTestId ? "PUT" : "POST",
        body: JSON.stringify(input),
      });
      setTests((await api("/admin/tests")).tests);
      resetTestBuilder();
      onToast(
        editingTestId ? "Draft mock test updated." : "Mock test saved as a draft.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await api(`/admin/tests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTests((old) =>
        old.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      onToast(`Mock test ${status}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveArticle() {
    try {
      const body = {
        categoryId: article.categoryId,
        title: article.title,
        body: article.body,
        status: article.status,
      };
      const path = article.id
        ? `/admin/current-affairs/${article.id}`
        : "/admin/current-affairs";
      await api(path, {
        method: article.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setAffairs((await api("/admin/current-affairs")).items);
      setArticle((a) => ({ ...a, id: "", title: "", body: "", status: "draft" }));
      onToast("Current affairs content saved.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addAffairQuestion(id: string) {
    try {
      await api(`/admin/current-affairs/${id}/questions`, {
        method: "POST",
        body: JSON.stringify({
          ...quiz,
          options: quiz.options.map((text, i) => ({
            key: String.fromCharCode(65 + i),
            text,
          })),
        }),
      });
      setQuiz({
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "A",
        explanation: "",
      });
      onToast("Quiz question added.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function gradeResponse(response: any) {
    const key = `${response.practice_session_id ?? response.attempt_id}:${response.question_id}`;
    const draft = gradingDrafts[key];
    if (draft?.score == null || draft.score === "") {
      setError("Enter a score before saving this evaluation.");
      return;
    }
    setBusy(true);
    try {
      await api(
        response.response_type === "practice"
          ? `/admin/practice-sessions/${response.practice_session_id}/answers/${response.question_id}/grade`
          : `/admin/attempts/${response.attempt_id}/answers/${response.question_id}/grade`,
        {
          method: "PUT",
          body: JSON.stringify({
            score: Number(draft.score),
            comment: draft.comment,
          }),
        },
      );
      const [report, queue] = await Promise.all([
        api("/admin/reports/attempts"),
        api("/admin/descriptive-responses"),
      ]);
      setReports(report.attempts);
      setDescriptiveResponses(queue.responses);
      setGradingDrafts(
        Object.fromEntries(
          queue.responses.map((r: any) => [
            `${r.practice_session_id ?? r.attempt_id}:${r.question_id}`,
            { score: "", comment: "" },
          ]),
        ),
      );
      onToast("Descriptive response graded and attempt score recalculated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function exportReports() {
    const headers = [
      "Student",
      "Email",
      "Exam",
      "Test",
      "Score",
      "Maximum",
      "Correct",
      "Wrong",
      "Unanswered",
      "Submitted",
    ];
    const rows = reports.map((r) => [
      r.full_name,
      r.email,
      r.exam_name,
      r.test_name,
      r.score,
      r.max_score,
      r.correct_count,
      r.wrong_count,
      r.unanswered_count,
      r.submitted_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "hhk-attempt-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-workspace">
      <div className="admin-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> ADMIN OVERVIEW
          </div>
          <h1>{section}</h1>
          <p className="subheading">
            Manage content and oversee the HHK preparation platform.
          </p>
        </div>
        <span className="local-badge">ROLE RESTRICTED</span>
      </div>

      {error && (
        <div className="admin-error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {busy && <div className="admin-loading">Loading from PostgreSQL…</div>}

      {section === "Admin dashboard" && (
        <AdminDashboardOverview
          stats={stats}
          activity={activity}
          onNavigate={onNavigate}
        />
      )}

      {section === "Students" && (
        <StudentManagementView
          students={students}
          search={search}
          busy={busy}
          onSearchChange={setSearch}
          onUpdateStudent={updateStudent}
        />
      )}

      {section === "Mock tests" && (
        <MockTestBuilderView
          tests={tests}
          exams={exams}
          questions={questions}
          builder={builder}
          editingTestId={editingTestId}
          examId={examId}
          stageId={stageId}
          testName={testName}
          description={description}
          duration={duration}
          reviewPolicy={reviewPolicy}
          selectionMode={selectionMode}
          selectionRules={selectionRules}
          availabilityStart={availabilityStart}
          availabilityEnd={availabilityEnd}
          selected={selected}
          busy={busy}
          onSetBuilder={setBuilder}
          onResetTestBuilder={resetTestBuilder}
          onEditTest={editTest}
          onChangeStatus={changeStatus}
          onCreateTest={createTest}
          onExamChange={(val) => applyExamAndStage(val)}
          onStageChange={(val) => {
            if (!val) {
              setStageId("");
              setSelectionRules([]);
              setSelected([]);
              if (!editingTestId) setTestName("");
              return;
            }
            const owningExam = exams.find((item: any) =>
              (item.stages ?? []).some((s: any) => s.id === val),
            );
            if (owningExam) {
              applyExamAndStage(owningExam.id, val);
            }
          }}
          onSetTestName={setTestName}
          onSetDescription={setDescription}
          onSetDuration={setDuration}
          onSetReviewPolicy={setReviewPolicy}
          onSetSelectionMode={(mode) => {
            setSelectionMode(mode);
            if (mode === "rule_based" && !selectionRules.length && stageId) {
              const currentExam = exams.find((item: any) => item.id === examId);
              const currentStage = (currentExam?.stages ?? []).find(
                (s: any) => s.id === stageId,
              );
              setSelectionRules(buildDefaultRules(currentStage));
            }
          }}
          onSetSelectionRules={setSelectionRules}
          onSetAvailabilityStart={setAvailabilityStart}
          onSetAvailabilityEnd={setAvailabilityEnd}
          onSetSelected={setSelected}
        />
      )}

      {section === "Current affairs" && (
        <CurrentAffairsView
          categories={categories}
          affairs={affairs}
          article={article}
          quiz={quiz}
          onArticleChange={setArticle}
          onQuizChange={setQuiz}
          onSaveArticle={saveArticle}
          onAddAffairQuestion={addAffairQuestion}
        />
      )}

      {section === "Reports" && (
        <AttemptReportsView
          reports={reports}
          descriptiveResponses={descriptiveResponses}
          gradingDrafts={gradingDrafts}
          busy={busy}
          onExportReports={exportReports}
          onDraftChange={(key, field, val) =>
            setGradingDrafts((old) => ({
              ...old,
              [key]: { ...(old[key] ?? { score: "", comment: "" }), [field]: val },
            }))
          }
          onGradeResponse={gradeResponse}
        />
      )}

      {section === "Settings" && <AuditLogsView logs={logs} />}
    </div>
  );
}
