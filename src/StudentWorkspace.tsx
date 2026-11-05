import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Play,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";

type Props = {
  section: string;
  user: { fullName: string };
  onNavigate: (page: string) => void;
  onToast: (message: string) => void;
};
async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error ?? "Request failed.");
  return data;
}
export default function StudentWorkspace({
  section,
  user,
  onNavigate,
  onToast,
}: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [pyq, setPyq] = useState<any[]>([]);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);
  const [affairs, setAffairs] = useState<any[]>([]);
  const [period, setPeriod] = useState("weekly");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [profileExams, setProfileExams] = useState<any[]>([]);
  const [profileDraft, setProfileDraft] = useState({
    fullName: "",
    mobile: "",
    targetExamId: "",
    preparationStatus: "starting",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [selectedExam, setSelectedExam] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(20);
  const [practice, setPractice] = useState<any>(null);
  const [practiceResponses, setPracticeResponses] = useState<any[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceChoice, setPracticeChoice] = useState("");
  const [practiceReview, setPracticeReview] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [filterExam, setFilterExam] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [affairQuiz, setAffairQuiz] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<any[]>([]);
  const [answerSaveState, setAnswerSaveState] = useState<
    "saved" | "saving" | "error"
  >("saved");
  const answerSaveChains = useRef(new Map<string, Promise<void>>());
  const answerSaveVersions = useRef(new Map<string, number>());
  const submitted = useRef(false);
  const sectionRefresh = useRef(false);
  const [affairCategories, setAffairCategories] = useState<any[]>([]);
  const [affairCategory, setAffairCategory] = useState("");
  const [filterStage, setFilterStage] = useState("");
  async function loadDashboard() {
    setData(await api("/dashboard"));
  }
  useEffect(() => {
    api("/attempts/active")
      .then(async (a) => {
        if (!a.attemptId) return;
        const current = await api(`/attempts/${a.attemptId}`);
        setAttemptId(a.attemptId);
        setClockOffset(Date.now() - new Date(current.serverNow).getTime());
        if (current.attempt.status === "in_progress") {
          setAttempt(current.attempt);
          setAttemptQuestions(current.questions);
        } else setResult(await api(`/attempts/${a.attemptId}/results`));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setBusy(true);
    setError("");
    let task: Promise<any>;
    if (section === "Overview" || section === "Performance")
      task = api("/dashboard").then(setData);
    else if (section === "Daily challenge")
      task = api("/daily-challenge").then(setDailyChallenge);
    else if (section === "Mock tests")
      task = Promise.all([api("/tests"), api("/attempts/active")]).then(
        async ([d, a]) => {
          setTests(d.tests);
          if (a.attemptId) {
            const current = await api(`/attempts/${a.attemptId}`);
            setAttemptId(a.attemptId);
            setClockOffset(Date.now() - new Date(current.serverNow).getTime());
            if (current.attempt.status === "in_progress") {
              setAttempt(current.attempt);
              setAttemptQuestions(current.questions);
            } else setResult(await api(`/attempts/${a.attemptId}/results`));
          }
        },
      );
    else if (section === "Practice")
      task = Promise.all([
        api("/practice/catalog"),
        api("/bookmarks"),
        api("/practice/responses"),
      ]).then(([d, b, r]) => {
        setCatalog(d.catalog);
        setBookmarks(new Set(b.bookmarks.map((q: any) => q.id)));
        setBookmarkedQuestions(b.bookmarks);
        setPracticeResponses(r.responses);
      });
    else if (section === "Bookmarks")
      task = api("/bookmarks").then((d) => {
        setBookmarkedQuestions(d.bookmarks);
        setBookmarks(new Set(d.bookmarks.map((q: any) => q.id)));
      });
    else if (section === "Previous year questions") {
      const params = new URLSearchParams();
      if (filterExam) params.set("examId", filterExam);
      if (filterStage) params.set("stage", filterStage);
      if (filterYear) params.set("year", filterYear);
      if (filterSection) params.set("section", filterSection);
      if (filterTopic) params.set("topic", filterTopic);
      if (filterDifficulty) params.set("difficulty", filterDifficulty);
      task = Promise.all([api("/exams"), api(`/pyq?${params}`)]).then(
        ([e, d]) => {
          setPublishedExams(e.exams);
          setPyq(d.questions);
        },
      );
    } else if (section === "Current affairs")
      task = api("/current-affairs").then((a) => setAffairs(a.items));
    else if (section === "Leaderboard")
      task = api(`/leaderboard?period=${period}`).then((d) =>
        setLeaderboard(d.entries),
      );
    else if (section === "Achievements")
      task = api("/achievements").then((d) => setAchievements(d.achievements));
    else if (section === "Profile")
      task = Promise.all([api("/auth/me"), api("/exams")]).then(([p, e]) => {
        setProfile(p);
        setProfileExams(e.exams);
        setProfileDraft({
          fullName: p.user.fullName,
          mobile: p.user.mobile,
          targetExamId: p.profile?.target_exam_id ?? "",
          preparationStatus: p.profile?.preparation_status ?? "starting",
        });
      });
    else task = Promise.resolve();
    task.catch((e) => setError(e.message)).finally(() => setBusy(false));
  }, [
    section,
    period,
    filterExam,
    filterStage,
    filterYear,
    filterSection,
    filterTopic,
    filterDifficulty,
  ]);
  useEffect(() => {
    if (section !== "Current affairs") return;
    const params = new URLSearchParams();
    if (affairCategory) params.set("categoryId", affairCategory);
    Promise.all([
      api("/current-affairs/categories"),
      api(`/current-affairs?${params}`),
    ])
      .then(([c, a]) => {
        setAffairCategories(c.categories);
        setAffairs(a.items);
      })
      .catch((e) => setError(e.message));
  }, [section, affairCategory]);
  const startAttempt = async (testId: string) => {
    setBusy(true);
    setError("");
    submitted.current = false;
    try {
      const started = await api(`/tests/${testId}/attempts`, {
        method: "POST",
        body: "{}",
      });
      setAttemptId(started.attempt.id);
      setClockOffset(Date.now() - new Date(started.serverNow).getTime());
      const current = await api(`/attempts/${started.attempt.id}`);
      setAttempt(current.attempt);
      setAttemptQuestions(current.questions);
      setIndex(0);
      setChoice(null);
      setReview(false);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveAnswer = async (
    question: any,
    answer: string | null,
    mark = review,
  ) => {
    if (!attemptId || !question) return;
    const id = question.question_id;
    const version = (answerSaveVersions.current.get(id) ?? 0) + 1;
    answerSaveVersions.current.set(id, version);
    const prior = answerSaveChains.current.get(id) ?? Promise.resolve();
    const pending = prior
      .catch(() => {})
      .then(async () => {
        try {
          await api(`/attempts/${attemptId}/answers/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              selectedAnswer: answer,
              markedForReview: mark,
              visited: true,
              timeSpentSeconds: question.time_spent_seconds ?? 0,
            }),
          });
          if (answerSaveVersions.current.get(id) === version) {
            setAttemptQuestions((old) =>
              old.map((q) =>
                q.question_id === id
                  ? {
                      ...q,
                      selected_answer: answer,
                      marked_for_review: mark,
                      visited: true,
                      time_spent_seconds: question.time_spent_seconds ?? 0,
                    }
                  : q,
              ),
            );
            setAnswerSaveState("saved");
          }
        } catch (e) {
          if (answerSaveVersions.current.get(id) === version) {
            setAnswerSaveState("error");
            setError((e as Error).message);
          }
        }
      });
    answerSaveChains.current.set(id, pending);
    setAnswerSaveState("saving");
    await pending;
    if (answerSaveChains.current.get(id) === pending)
      answerSaveChains.current.delete(id);
  };
  const submit = async (auto = false) => {
    if (!attemptId || submitted.current) return;
    if (
      !auto &&
      !window.confirm(
        "Submit this mock test now? You will not be able to change your answers.",
      )
    )
      return;
    submitted.current = true;
    try {
      await api(`/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ auto }),
      });
      const done = await api(`/attempts/${attemptId}/results`);
      setResult(done);
      setAttempt(null);
      setAttemptId("");
      onToast(
        auto
          ? "Time ended. Your answers were submitted automatically."
          : "Mock test submitted.",
      );
    } catch (e) {
      submitted.current = false;
      if (!auto) setError((e as Error).message);
    }
  };
  const refreshAttempt = async () => {
    if (!attemptId || sectionRefresh.current) return;
    sectionRefresh.current = true;
    try {
      const current = await api(`/attempts/${attemptId}`);
      setClockOffset(Date.now() - new Date(current.serverNow).getTime());
      if (current.attempt.status === "in_progress") {
        if (
          current.attempt.current_section_id !== attempt?.current_section_id
        ) {
          setIndex(0);
          setChoice(null);
          setReview(false);
        }
        setAttempt(current.attempt);
        setAttemptQuestions(current.questions);
      } else {
        const done = await api(`/attempts/${attemptId}/results`);
        setResult(done);
        setAttempt(null);
        setAttemptId("");
        onToast("Mock test time ended. Your answers were submitted.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      sectionRefresh.current = false;
    }
  };
  useEffect(() => {
    const deadline = attempt?.section_ends_at ?? attempt?.ends_at;
    if (!deadline) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(deadline).getTime() - (Date.now() - clockOffset)) / 1000,
        ),
      );
      setRemaining(seconds);
      if (seconds === 0) void refreshAttempt();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.ends_at, attempt?.section_ends_at, attemptId, clockOffset]);
  useEffect(() => {
    if (!attemptId || !attemptQuestions[index]) return;
    const q = attemptQuestions[index];
    setChoice(q.selected_answer ?? null);
    setReview(Boolean(q.marked_for_review));
    void saveAnswer(q, q.selected_answer ?? null, Boolean(q.marked_for_review));
  }, [attemptId, index, attempt?.current_section_id, attemptQuestions.length]);
  async function startPractice() {
    setBusy(true);
    setError("");
    try {
      const out = await api("/practice/sessions", {
        method: "POST",
        body: JSON.stringify({
          sectionId,
          topicName: topicName || undefined,
          difficulty,
          count,
        }),
      });
      setPractice(out);
      setPracticeIndex(0);
      setPracticeChoice("");
      setPracticeReview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answerPractice(key: string) {
    if (!practice) return;
    const q = practice.questions[practiceIndex];
    if (practiceReview || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/practice/sessions/${practice.session.id}/answers/${q.id}`, {
        method: "PUT",
        body: JSON.stringify({ selectedAnswer: key, timeSpentSeconds: 0 }),
      });
      setPracticeChoice(key);
      setPractice((old: any) => ({
        ...old,
        questions: old.questions.map((item: any) =>
          item.id === q.id ? { ...item, selected_answer: key } : item,
        ),
      }));
      setPracticeReview(
        (
          await api(
            `/practice/sessions/${practice.session.id}/questions/${q.id}/review`,
          )
        ).question,
      );
      setPracticeResponses((await api("/practice/responses")).responses);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function goPracticeQuestion(next: number) {
    if (!practice || next < 0 || next >= practice.questions.length) return;
    const target = practice.questions[next];
    setPracticeIndex(next);
    if (!target.selected_answer) {
      setPracticeChoice("");
      setPracticeReview(null);
      return;
    }
    try {
      const saved = (
        await api(
          `/practice/sessions/${practice.session.id}/questions/${target.id}/review`,
        )
      ).question;
      setPracticeChoice(target.selected_answer);
      setPracticeReview(saved);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function startBookmarkedQuestion(question: any) {
    setBusy(true);
    setError("");
    try {
      const out = await api("/practice/sessions", {
        method: "POST",
        body: JSON.stringify({
          sectionId: question.section_id,
          questionId: question.id,
          count: 1,
        }),
      });
      setPractice(out);
      setPracticeIndex(0);
      setPracticeChoice("");
      setPracticeReview(null);
      onNavigate("Practice");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleBookmark(qid: string) {
    const bookmarked = bookmarks.has(qid);
    try {
      await api(`/bookmarks/${qid}`, { method: bookmarked ? "DELETE" : "PUT" });
      setBookmarks((old) => {
        const next = new Set(old);
        if (bookmarked) next.delete(qid);
        else next.add(qid);
        return next;
      });
      if (bookmarked)
        setBookmarkedQuestions((old) => old.filter((q: any) => q.id !== qid));
      onToast(bookmarked ? "Bookmark removed." : "Question bookmarked.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function openAffair(id: string) {
    try {
      const quiz = await api(`/current-affairs/${id}/quiz`);
      const index = Math.max(
        0,
        quiz.questions.findIndex((q: any) => !q.selected_answer),
      );
      const current = quiz.questions[index];
      setAffairQuiz({
        id,
        questions: quiz.questions,
        index,
        feedback: current?.selected_answer
          ? {
              correct: current.is_correct,
              correctAnswer: current.correct_answer,
              explanation: current.explanation,
            }
          : null,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function answerAffair(key: string) {
    if (!affairQuiz) return;
    try {
      const q = affairQuiz.questions[affairQuiz.index];
      const out = await api(
        `/current-affairs/${affairQuiz.id}/quiz/${q.id}/answer`,
        { method: "POST", body: JSON.stringify({ answer: key }) },
      );
      setAffairQuiz((old: any) => ({
        ...old,
        feedback: out,
        questions: old.questions.map((item: any, i: number) =>
          i === old.index
            ? {
                ...item,
                selected_answer: out.selectedAnswer,
                is_correct: out.correct,
                correct_answer: out.correctAnswer,
                explanation: out.explanation,
              }
            : item,
        ),
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function showAffairQuestion(index: number) {
    if (!affairQuiz || index < 0 || index >= affairQuiz.questions.length)
      return;
    const q = affairQuiz.questions[index];
    setAffairQuiz({
      ...affairQuiz,
      index,
      feedback: q.selected_answer
        ? {
            correct: q.is_correct,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
          }
        : null,
    });
  }
  async function answerDailyChallenge(key: string) {
    if (!dailyChallenge) return;
    const question = dailyChallenge.questions[dailyIndex];
    if (!question || question.selected_answer) return;
    try {
      const feedback = await api(
        `/daily-challenge/${dailyChallenge.session.id}/questions/${question.question_id}/answer`,
        { method: "POST", body: JSON.stringify({ answer: key }) },
      );
      setDailyChallenge((old: any) => ({
        ...old,
        questions: old.questions.map((q: any) =>
          q.question_id === question.question_id
            ? {
                ...q,
                selected_answer: feedback.selectedAnswer,
                is_correct: feedback.correct,
                correct_answer: feedback.correctAnswer,
                explanation: feedback.explanation,
              }
            : q,
        ),
        progress: {
          ...old.progress,
          answered: old.progress.answered + (feedback.alreadyAnswered ? 0 : 1),
          correct:
            old.progress.correct +
            (feedback.alreadyAnswered || !feedback.correct ? 0 : 1),
        },
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (attempt)
    return (
      <TestRunner
        attempt={attempt}
        questions={attemptQuestions}
        index={index}
        setIndex={setIndex}
        choice={choice}
        setChoice={setChoice}
        review={review}
        setReview={setReview}
        remaining={remaining}
        saveState={answerSaveState}
        onSave={saveAnswer}
        onSubmit={() => submit(false)}
        onError={setError}
      />
    );
  if (result)
    return (
      <ResultView
        result={result}
        onBack={() => {
          setResult(null);
          onNavigate("Performance");
        }}
      />
    );
  if (practice && section === "Practice")
    return (
      <PracticeRunner
        practice={practice}
        index={practiceIndex}
        setIndex={setPracticeIndex}
        choice={practiceChoice}
        setChoice={setPracticeChoice}
        review={practiceReview}
        onAnswer={answerPractice}
        onSelect={goPracticeQuestion}
        busy={busy}
        onBookmark={toggleBookmark}
        bookmarks={bookmarks}
        onExit={() => setPractice(null)}
      />
    );
  const summary = data?.summary ?? {};
  return (
    <div className="student-workspace">
      {error && (
        <div className="admin-error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {busy && <div className="admin-loading">Loading your data…</div>}
      {section === "Overview" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> YOUR PREPARATION
              </div>
              <h1>Welcome, {user.fullName.split(" ")[0]}</h1>
              <p>Your progress is built one focused session at a time.</p>
            </div>
            <button
              className="primary-btn"
              onClick={() => onNavigate("Mock tests")}
            >
              Explore mock tests <ArrowRight size={15} />
            </button>
          </div>
          <div className="stats-grid">
            {[
              ["Mock tests attempted", summary.attempts ?? 0, Target],
              ["Questions attempted", summary.questions ?? 0, Activity],
              ["Average score", summary.average_score ?? 0, ShieldCheck],
              ["Overall accuracy", `${summary.accuracy ?? 0}%`, Trophy],
            ].map(([label, value, Icon]: any) => (
              <div className="stat-card" key={label}>
                <span className="stat-icon lavender">
                  <Icon size={17} />
                </span>
                <span className="stat-label">{label}</span>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>
          <div className="student-panels">
            <section className="panel admin-panel">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">RECENT WORK</span>
                  <h2>Recent mock tests</h2>
                </div>
                <button
                  className="text-link"
                  onClick={() => onNavigate("Performance")}
                >
                  View history <ArrowRight size={14} />
                </button>
              </div>
              {data?.recent?.length ? (
                data.recent.map((t: any) => (
                  <div className="history-row" key={t.id}>
                    <div>
                      <strong>{t.test_name}</strong>
                      <span>
                        {t.exam_name} ·{" "}
                        {new Date(t.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <b>
                      {t.score} / {t.max_score}
                    </b>
                  </div>
                ))
              ) : (
                <div className="empty-questions">
                  <strong>No completed mocks yet</strong>
                  <span>Choose a published test when you are ready.</span>
                </div>
              )}
            </section>
            <section className="panel admin-panel">
              <div className="section-kicker">FOCUS AREAS</div>
              <h2>Topic accuracy</h2>
              {data?.weakTopics?.length ? (
                data.weakTopics.map((t: any) => (
                  <div className="focus-area" key={t.topic_name}>
                    <div className="focus-title">
                      <div>
                        <strong>{t.topic_name}</strong>
                        <span>{t.attempts} answers</span>
                      </div>
                      <b>{t.accuracy}%</b>
                    </div>
                    <div className="focus-meter">
                      <i
                        className="coral"
                        style={{ width: `${t.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-questions">
                  <span>Practice a few topics to see tailored insights.</span>
                </div>
              )}
              <button
                className="recommend-btn"
                onClick={() => onNavigate("Practice")}
              >
                Start topic practice <ArrowRight size={14} />
              </button>
            </section>
          </div>
        </>
      )}
      {section === "Daily challenge" && (
        <DailyChallengeView
          challenge={dailyChallenge}
          index={dailyIndex}
          setIndex={setDailyIndex}
          onAnswer={answerDailyChallenge}
        />
      )}
      {section === "Performance" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">PERFORMANCE</div>
              <h1>Your results and progress</h1>
              <p>
                Mock scores use submitted attempts. Overall accuracy includes
                objective answers from mocks, practice, current affairs, and
                daily challenges.
              </p>
            </div>
          </div>
          <div className="stats-grid">
            {[
              ["Tests attempted", summary.attempts ?? 0],
              ["Questions attempted", summary.questions ?? 0],
              ["Average score", summary.average_score ?? 0],
              ["Accuracy", `${summary.accuracy ?? 0}%`],
            ].map(([l, v]) => (
              <div className="stat-card" key={l}>
                <span className="stat-label">{l}</span>
                <div className="stat-value">{v}</div>
              </div>
            ))}
          </div>
          <div className="panel admin-panel">
            <h2>Test history</h2>
            {data?.recent?.map((t: any) => (
              <div className="history-row" key={t.id}>
                <div>
                  <strong>{t.test_name}</strong>
                  <span>
                    {t.exam_name} ·{" "}
                    {new Date(t.started_at).toLocaleDateString()}
                  </span>
                </div>
                <b>
                  {t.score}/{t.max_score} · {t.correct_count} right ·{" "}
                  {t.wrong_count} wrong
                </b>
                <button
                  className="outline-btn admin-action"
                  onClick={async () => {
                    try {
                      setResult(await api(`/attempts/${t.id}/results`));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
          <div className="panel admin-panel">
            <h2>Section accuracy</h2>
            {data?.sections?.map((s: any) => (
              <div className="focus-area" key={s.section_name}>
                <div className="focus-title">
                  <div>
                    <strong>{s.section_name}</strong>
                    <span>{s.questions} questions</span>
                  </div>
                  <b>{s.accuracy}%</b>
                </div>
                <div className="focus-meter">
                  <i className="blue" style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {section === "Mock tests" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">COMPUTER-BASED MOCKS</div>
              <h1>Choose a mock test</h1>
              <p>
                Published tests use the configured sections, timer, and marking
                rules.
              </p>
            </div>
          </div>
          {tests.length ? (
            tests.map((t) => (
              <div className="panel test-card" key={t.id}>
                <div>
                  <span className="exam-pill">
                    {t.exam_name} · {t.stage_name}
                  </span>
                  <h2>{t.name}</h2>
                  <p>{t.description || "Timed computer-based mock test"}</p>
                  <span>
                    <Clock3 size={14} /> {Math.round(t.duration_seconds / 60)}{" "}
                    minutes
                  </span>
                  {t.pattern_cycle && (
                    <span className="pattern-cycle-label">
                      Pattern cycle: {t.pattern_cycle}
                    </span>
                  )}
                  {t.pattern_source_url && (
                    <a
                      className="pattern-source-link"
                      href={t.pattern_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View official recruitment notice <ArrowRight size={13} />
                    </a>
                  )}
                </div>
                <button
                  className="primary-btn"
                  disabled={busy}
                  onClick={() => startAttempt(t.id)}
                >
                  <Play size={14} fill="currentColor" /> Start test
                </button>
              </div>
            ))
          ) : (
            <div className="panel empty-questions">
              <strong>No published tests available</strong>
              <span>
                Mock tests will appear here once an administrator publishes
                them.
              </span>
            </div>
          )}
        </>
      )}
      {section === "Practice" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">STRUCTURED PRACTICE</div>
              <h1>Practice by topic</h1>
              <p>
                Choose a published exam section, topic, difficulty, and question
                count.
              </p>
            </div>
          </div>
          <section className="panel admin-panel practice-setup">
            <div className="question-config">
              <label>
                Exam
                <select
                  value={selectedExam}
                  onChange={(e) => {
                    setSelectedExam(e.target.value);
                    setSectionId("");
                    setTopicName("");
                  }}
                >
                  <option value="">Select exam</option>
                  {[
                    ...new Map(catalog.map((c) => [c.exam_id, c])).values(),
                  ].map((c: any) => (
                    <option key={c.exam_id} value={c.exam_id}>
                      {c.exam_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <select
                  value={sectionId}
                  onChange={(e) => {
                    setSectionId(e.target.value);
                    setTopicName("");
                  }}
                >
                  <option value="">Select section</option>
                  {[
                    ...new Map(
                      catalog
                        .filter((c) => c.exam_id === selectedExam)
                        .map((c) => [c.section_id, c]),
                    ).values(),
                  ].map((c: any) => (
                    <option key={c.section_id} value={c.section_id}>
                      {c.stage_name} · {c.section_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Topic
                <select
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                >
                  <option value="">Any topic</option>
                  {catalog
                    .filter((c) => c.section_id === sectionId && c.topic_name)
                    .map((c: any) => (
                      <option key={c.topic_id} value={c.topic_name}>
                        {c.topic_name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <Field
                label="Question count"
                value={String(count)}
                onChange={(v) =>
                  setCount(Math.max(1, Math.min(100, Number(v))))
                }
              />
            </div>
            <button
              className="primary-btn"
              disabled={!sectionId || busy}
              onClick={startPractice}
            >
              Start practice <ArrowRight size={14} />
            </button>
            <section className="panel admin-panel">
              <h2>Recent practice responses</h2>
              {practiceResponses.map((r: any) => (
                <article
                  className="result-review"
                  key={`${r.practice_session_id}:${r.question_id}`}
                >
                  <span>
                    {r.exam_name} · {r.section_name} · {r.topic_name} ·{" "}
                    {r.difficulty}
                  </span>
                  <h3>{r.question_text}</h3>
                  <div className="descriptive-result">
                    <pre>{r.response}</pre>
                    {r.question_type === "descriptive" ? (
                      r.manual_score == null ? (
                        <span>
                          Pending evaluator review · {r.max_marks} marks
                        </span>
                      ) : (
                        <>
                          <b>
                            Score: {r.manual_score} / {r.max_marks} marks
                          </b>
                          {r.grader_comment && <p>{r.grader_comment}</p>}
                        </>
                      )
                    ) : (
                      <strong>{r.is_correct ? "Correct" : "Incorrect"}</strong>
                    )}
                  </div>
                </article>
              ))}
              {!practiceResponses.length && (
                <div className="empty-questions">
                  Your submitted practice responses will appear here.
                </div>
              )}
            </section>
          </section>
        </>
      )}
      {section === "Bookmarks" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">SAVED STUDY SET</div>
              <h1>Bookmarked questions</h1>
              <p>
                Return to questions you saved and practice any one directly.
              </p>
            </div>
          </div>
          <div className="student-panels">
            {bookmarkedQuestions.map((q) => (
              <article className="panel pyq-card" key={q.id}>
                <div className="saved-question-meta">
                  <span>
                    {q.exam_name} · {q.source_year ?? "Question bank"}
                    {q.source ? ` · ${q.source}` : ""}
                  </span>
                  <span>
                    {q.stage_name} · {q.section_name} · {q.topic_name}
                  </span>
                  <span>{q.difficulty}</span>
                </div>
                <PassageBlock
                  title={q.passage_title}
                  text={q.passage_text}
                  language={q.passage_language}
                  imageUrl={q.passage_image_url}
                />
                <p>{q.question_text}</p>
                {q.image_url && (
                  <img
                    className="question-illustration"
                    src={q.image_url}
                    alt="Question illustration"
                    loading="lazy"
                  />
                )}
                {q.question_type === "descriptive" ? (
                  <span>Written response question</span>
                ) : (
                  <div className="pyq-options">
                    {q.options.map((o: any) => (
                      <span key={o.key}>
                        {o.key}. {o.text}
                      </span>
                    ))}
                  </div>
                )}
                <div className="cbt-controls">
                  <button
                    className="primary-btn"
                    disabled={busy}
                    onClick={() => void startBookmarkedQuestion(q)}
                  >
                    Practice this question <ArrowRight size={14} />
                  </button>
                  <button
                    className="outline-btn admin-action"
                    onClick={() => void toggleBookmark(q.id)}
                  >
                    Remove bookmark
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!bookmarkedQuestions.length && !busy && (
            <div className="panel empty-questions">
              No bookmarked questions yet. Save a question from Previous year
              questions or Practice to find it here.
            </div>
          )}
        </>
      )}{" "}
      {section === "Previous year questions" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">VERIFIED PREVIOUS PAPERS</div>
              <h1>Previous year questions</h1>
              <p>
                Questions are shown only after admin review and publication.
              </p>
            </div>
          </div>
          <div className="pyq-filters">
            <label className="form-field">
              Exam
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
              >
                <option value="">All published exams</option>
                {publishedExams.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Stage
              <input
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                placeholder="Any stage"
              />
            </label>
            <label className="form-field">
              Year
              <input
                type="number"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                placeholder="Any year"
              />
            </label>
            <label className="form-field">
              Section
              <input
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                placeholder="Any section"
              />
            </label>
            <label className="form-field">
              Topic
              <input
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                placeholder="Any topic"
              />
            </label>
            <label className="form-field">
              Difficulty
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
          <div className="student-panels">
            {pyq.map((q) => (
              <article className="panel pyq-card" key={q.id}>
                <div className="saved-question-meta">
                  <span>
                    {q.exam_name} · {q.source_year}
                    {q.source ? ` · ${q.source}` : ""}
                  </span>
                  <span>
                    {q.stage_name} · {q.section_name} · {q.topic_name}
                  </span>
                  <span>{q.difficulty}</span>
                </div>
                <PassageBlock
                  title={q.passage_title}
                  text={q.passage_text}
                  language={q.passage_language}
                  imageUrl={q.passage_image_url}
                />
                <p>{q.question_text}</p>
                {q.image_url && (
                  <img
                    className="question-illustration"
                    src={q.image_url}
                    alt="Question illustration"
                    loading="lazy"
                  />
                )}
                <div className="pyq-options">
                  {q.options.map((o: any) => (
                    <span key={o.key}>
                      {o.key}. {o.text}
                    </span>
                  ))}
                </div>
                <button
                  className="outline-btn admin-action"
                  onClick={() => toggleBookmark(q.id)}
                >
                  <Bookmark
                    size={13}
                    fill={bookmarks.has(q.id) ? "currentColor" : "none"}
                  />{" "}
                  {bookmarks.has(q.id) ? "Bookmarked" : "Bookmark"}
                </button>
              </article>
            ))}
          </div>
          {!pyq.length && (
            <div className="panel empty-questions">
              No verified previous-year questions have been published yet.
            </div>
          )}
        </>
      )}
      {section === "Current affairs" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">DAILY LEARNING</div>
              <h1>Current affairs</h1>
              <p>Read a short briefing, then try its quiz.</p>
            </div>
            <label className="form-field">
              Category
              <select
                value={affairCategory}
                onChange={(e) => setAffairCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {affairCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {affairQuiz ? (
            <section className="panel admin-panel">
              <button
                className="outline-btn admin-action"
                onClick={() => setAffairQuiz(null)}
              >
                Back to notes
              </button>
              <h2>
                Quick quiz · Question {affairQuiz.index + 1} of{" "}
                {affairQuiz.questions.length}
              </h2>
              {(() => {
                const q = affairQuiz.questions[affairQuiz.index];
                return (
                  <div className="affair-question" key={q.id}>
                    <strong>{q.question_text}</strong>
                    <div className="pyq-options">
                      {q.options.map((o: any) => (
                        <button
                          disabled={Boolean(affairQuiz.feedback)}
                          className="outline-btn"
                          key={o.key}
                          onClick={() => answerAffair(o.key)}
                        >
                          {o.key}. {o.text}
                        </button>
                      ))}
                    </div>
                    {affairQuiz.feedback && (
                      <>
                        <p
                          className={
                            affairQuiz.feedback.correct
                              ? "feedback-correct"
                              : "feedback-wrong"
                          }
                        >
                          {affairQuiz.feedback.correct
                            ? "Correct."
                            : "Review the answer."}{" "}
                          Correct answer: {affairQuiz.feedback.correctAnswer}.{" "}
                          {affairQuiz.feedback.explanation}
                        </p>
                        <div className="cbt-controls">
                          <button
                            className="outline-btn"
                            disabled={!affairQuiz.index}
                            onClick={() =>
                              showAffairQuestion(affairQuiz.index - 1)
                            }
                          >
                            <ChevronLeft size={15} /> Previous
                          </button>
                          <div />
                          <button
                            className="primary-btn"
                            onClick={() =>
                              affairQuiz.index + 1 < affairQuiz.questions.length
                                ? showAffairQuestion(affairQuiz.index + 1)
                                : setAffairQuiz(null)
                            }
                          >
                            {affairQuiz.index + 1 < affairQuiz.questions.length
                              ? "Next question"
                              : "Finish quiz"}{" "}
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </section>
          ) : (
            affairs.map((item) => (
              <article className="panel affair-card" key={item.id}>
                <span className="exam-pill">
                  {item.category} ·{" "}
                  {item.published_at
                    ? new Date(item.published_at).toLocaleDateString()
                    : ""}
                </span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                {item.quiz_count > 0 && (
                  <button
                    className="text-link"
                    onClick={() => openAffair(item.id)}
                  >
                    Take quiz <ArrowRight size={14} />
                  </button>
                )}
              </article>
            ))
          )}
          {!affairs.length && !affairQuiz && (
            <div className="panel empty-questions">
              No current affairs have been published yet.
            </div>
          )}
        </>
      )}
      {section === "Leaderboard" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">COMMUNITY</div>
              <h1>Leaderboard</h1>
              <p>Rankings use submitted mock attempts.</p>
            </div>
            <select
              className="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="overall">Overall</option>
            </select>
          </div>
          <div className="panel admin-panel">
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Aspirant</th>
                    <th>Best score</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((u, i) => (
                    <tr key={u.id}>
                      <td>{i + 1}</td>
                      <td>{u.full_name}</td>
                      <td>{u.best_score}</td>
                      <td>{u.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!leaderboard.length && (
              <div className="empty-questions">
                Leaderboard entries will appear when mock tests are submitted.
              </div>
            )}
          </div>
        </>
      )}
      {section === "Achievements" && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">MILESTONES</div>
              <h1>Achievements</h1>
              <p>Keep preparing to unlock new milestones.</p>
            </div>
          </div>
          <div className="stats-grid">
            {achievements.map((a) => (
              <div className="stat-card" key={a.code}>
                <span className="stat-icon peach">
                  <Trophy size={17} />
                </span>
                <span className="stat-label">
                  {a.earned_at ? "UNLOCKED" : "LOCKED"}
                </span>
                <div className="stat-value achievement-title">{a.name}</div>
                <p>{a.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {section === "Profile" && profile && (
        <>
          <div className="student-welcome">
            <div>
              <div className="eyebrow">ACCOUNT</div>
              <h1>Your profile</h1>
              <p>Keep your contact details and preparation goal up to date.</p>
            </div>
          </div>
          <section className="panel admin-panel profile-editor">
            <div className="profile-form-grid">
              <label className="form-field">
                Full name
                <input
                  value={profileDraft.fullName}
                  onChange={(e) =>
                    setProfileDraft({
                      ...profileDraft,
                      fullName: e.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field">
                Email
                <input value={profile.user.email} disabled />
              </label>
              <label className="form-field">
                Mobile number
                <input
                  value={profileDraft.mobile}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, mobile: e.target.value })
                  }
                />
              </label>
              <label className="form-field">
                Target examination
                <select
                  value={profileDraft.targetExamId}
                  onChange={(e) =>
                    setProfileDraft({
                      ...profileDraft,
                      targetExamId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose an exam</option>
                  {profileExams.map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Preparation status
                <select
                  value={profileDraft.preparationStatus}
                  onChange={(e) =>
                    setProfileDraft({
                      ...profileDraft,
                      preparationStatus: e.target.value,
                    })
                  }
                >
                  <option value="starting">Starting</option>
                  <option value="preparing">Preparing</option>
                  <option value="revision">Revision</option>
                </select>
              </label>
            </div>
            <div className="admin-footer">
              <span>
                Email address is used to sign in and cannot be changed here.
              </span>
              <button
                className="primary-btn"
                disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true);
                  try {
                    await api("/auth/profile", {
                      method: "PATCH",
                      body: JSON.stringify({
                        ...profileDraft,
                        targetExamId: profileDraft.targetExamId || null,
                      }),
                    });
                    const updated = await api("/auth/me");
                    setProfile(updated);
                    onToast("Profile updated.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setProfileSaving(false);
                  }
                }}
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </section>
        </>
      )}
      {section === "Performance" && (
        <div className="panel admin-panel">
          <h2>Learning activity</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Current affairs answered</span>
              <div className="stat-value">
                {summary.current_affairs_answered ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Current affairs accuracy</span>
              <div className="stat-value">
                {summary.current_affairs_accuracy ?? 0}%
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Current study streak</span>
              <div className="stat-value">
                {summary.current_streak ?? 0} days
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Best study streak</span>
              <div className="stat-value">{summary.best_streak ?? 0} days</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PassageBlock({
  title,
  text,
  language,
  imageUrl,
}: {
  title?: string | null;
  text?: string | null;
  language?: string | null;
  imageUrl?: string | null;
}) {
  if (!text) return null;
  return (
    <article className="question-passage">
      {title && <strong>{title}</strong>}
      {language && <small>{language}</small>}
      {imageUrl && (
        <img src={imageUrl} alt="Passage illustration" loading="lazy" />
      )}
      <p>{text}</p>
    </article>
  );
}
function DailyChallengeView({
  challenge,
  index,
  setIndex,
  onAnswer,
}: {
  challenge: any;
  index: number;
  setIndex: (index: number) => void;
  onAnswer: (key: string) => void;
}) {
  if (!challenge)
    return (
      <section className="panel admin-panel">
        <div className="student-welcome">
          <div>
            <div className="eyebrow">DAILY PRACTICE</div>
            <h1>Today’s challenge</h1>
            <p>Loading today’s question set…</p>
          </div>
        </div>
      </section>
    );
  const { questions, progress, session } = challenge;
  if (!questions.length)
    return (
      <section className="panel admin-panel">
        <div className="student-welcome">
          <div>
            <div className="eyebrow">DAILY PRACTICE</div>
            <h1>Today’s challenge</h1>
            <p>
              No published questions are available in the challenge subjects
              yet. Try again after question content is published.
            </p>
          </div>
        </div>
      </section>
    );
  const current = Math.min(index, questions.length - 1);
  const item = questions[current];
  const q = item.question_snapshot;
  const options =
    typeof q.options === "string" ? JSON.parse(q.options) : q.options;
  const done = progress.answered === progress.total;
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">
            DAILY PRACTICE ·{" "}
            {new Date(
              `${session.challenge_date}T00:00:00`,
            ).toLocaleDateString()}
          </div>
          <h1>Today’s challenge</h1>
          <p>
            A short set drawn from reasoning, quantitative aptitude, English,
            and general awareness.
          </p>
        </div>
        <div className="challenge-score">
          <strong>
            {progress.correct}/{progress.answered}
          </strong>
          <span>
            {progress.answered} of {progress.total} answered
          </span>
        </div>
      </div>
      <section className="panel admin-panel daily-challenge-card">
        <div className="cbt-question-meta">
          <span>
            {q.category} · Question {current + 1} of {questions.length}
          </span>
          <span>
            {q.topic_name} · {q.difficulty}
          </span>
        </div>
        <div className="challenge-progress">
          <i
            style={{
              width: `${progress.total ? (progress.answered / progress.total) * 100 : 0}%`,
            }}
          />
        </div>
        <PassageBlock
          title={q.passage_title}
          text={q.passage_text}
          language={q.passage_language}
          imageUrl={q.passage_image_url}
        />
        <h2>{q.question_text}</h2>
        {q.image_url && (
          <img
            className="question-illustration"
            src={q.image_url}
            alt="Question illustration"
          />
        )}
        <div className="cbt-options">
          {options.map((option: any) => (
            <button
              key={option.key}
              disabled={Boolean(item.selected_answer)}
              className={`cbt-option ${item.selected_answer === option.key ? "chosen" : ""}`}
              onClick={() => onAnswer(option.key)}
            >
              <i>{option.key}</i>
              <span>{option.text}</span>
              {item.selected_answer === option.key && <Check size={16} />}
            </button>
          ))}
        </div>
        {item.selected_answer && (
          <div
            className={item.is_correct ? "feedback-correct" : "feedback-wrong"}
          >
            <strong>
              {item.is_correct ? "Correct" : "Not quite"} · Correct answer:{" "}
              {item.correct_answer}
            </strong>
            <p>{item.explanation || "No explanation has been added yet."}</p>
          </div>
        )}
        {done && (
          <div className="challenge-complete">
            <strong>Challenge complete</strong>
            <span>
              You answered {progress.correct} of {progress.total} questions
              correctly. Come back tomorrow for a new set.
            </span>
          </div>
        )}
        <div className="cbt-controls">
          <span>{progress.total - progress.answered} remaining</span>
          <div />
          <button
            className="outline-btn"
            disabled={current === 0}
            onClick={() => setIndex(current - 1)}
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <button
            className="primary-btn"
            disabled={current === questions.length - 1}
            onClick={() => setIndex(current + 1)}
          >
            Next question <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}
function TestRunner({
  attempt,
  questions,
  index,
  setIndex,
  choice,
  setChoice,
  review,
  setReview,
  remaining,
  saveState,
  onSave,
  onSubmit,
  onError,
}: {
  attempt: any;
  questions: any[];
  index: number;
  setIndex: (i: number) => void;
  choice: string | null;
  setChoice: (v: string | null) => void;
  review: boolean;
  setReview: (v: boolean) => void;
  remaining: number;
  saveState: "saved" | "saving" | "error";
  onSave: (q: any, a: string | null, m: boolean) => Promise<void>;
  onSubmit: () => void;
  onError: (s: string) => void;
}) {
  const q = questions[index];
  const viewedAt = useRef(Date.now());
  const baseSeconds = useRef(0);
  const choiceRef = useRef(choice);
  const reviewRef = useRef(review);
  choiceRef.current = choice;
  reviewRef.current = review;
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!q) return;
    baseSeconds.current = q.time_spent_seconds ?? 0;
    viewedAt.current = Date.now();
    const timer = setInterval(() => {
      const elapsed =
        baseSeconds.current +
        Math.floor((Date.now() - viewedAt.current) / 1000);
      void onSave(
        { ...q, time_spent_seconds: elapsed },
        choiceRef.current,
        reviewRef.current,
      );
    }, 15000);
    return () => clearInterval(timer);
  }, [q?.question_id, index]);
  if (!q) return <div className="panel">Loading attempt…</div>;
  const options =
    typeof q.options === "string" ? JSON.parse(q.options) : q.options;
  const answered = questions.filter((item) => item.selected_answer).length;
  const time = `${String(Math.floor(remaining / 3600)).padStart(2, "0")}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  function currentQuestion() {
    return {
      ...q,
      time_spent_seconds:
        baseSeconds.current +
        Math.floor((Date.now() - viewedAt.current) / 1000),
    };
  }
  function selectAnswer(key: string) {
    setChoice(key);
    if (q.question_type === "descriptive") {
      if (answerTimer.current) clearTimeout(answerTimer.current);
      answerTimer.current = setTimeout(
        () => void onSave(currentQuestion(), key, review),
        450,
      );
    } else void onSave(currentQuestion(), key, review);
  }
  function mark() {
    const value = !review;
    setReview(value);
    void onSave(currentQuestion(), choice, value);
  }
  function clearCurrent() {
    if (answerTimer.current) {
      clearTimeout(answerTimer.current);
      answerTimer.current = null;
    }
    setChoice(null);
    void onSave(currentQuestion(), null, review);
  }
  async function saveCurrent() {
    if (answerTimer.current) {
      clearTimeout(answerTimer.current);
      answerTimer.current = null;
    }
    await onSave(currentQuestion(), choice, review);
  }
  async function goTo(next: number) {
    await saveCurrent();
    setIndex(next);
  }
  async function submitCurrent() {
    await saveCurrent();
    onSubmit();
  }
  return (
    <div className="cbt-screen">
      <header className="cbt-header">
        <div>
          <span className="exam-pill">{attempt.test_name}</span>
          <h1>{questions[index].section_name}</h1>
        </div>
        <div className="cbt-timer">
          <Clock3 size={17} />
          <span>
            {attempt.section_ends_at
              ? "Section time remaining"
              : "Time remaining"}
          </span>
          <b>{time}</b>
        </div>
        <button className="outline-btn" onClick={() => void submitCurrent()}>
          Submit test
        </button>
      </header>
      <div className="cbt-main">
        <div className="cbt-question-card">
          <div className="cbt-question-meta">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>
              {q.topic_name} · {q.difficulty}
            </span>
            <button className="outline-btn admin-action" onClick={mark}>
              {review ? "Unmark review" : "Mark for review"}
            </button>
          </div>
          <PassageBlock
            title={q.passage_title}
            text={q.passage_text}
            language={q.passage_language}
            imageUrl={q.passage_image_url}
          />
          <h2>{q.question_text}</h2>
          {q.image_url && (
            <img
              className="question-illustration"
              src={q.image_url}
              alt="Question illustration"
            />
          )}
          {q.question_type === "descriptive" ? (
            <label className="descriptive-response">
              <span>
                Type your response. It will be evaluated after submission.
              </span>
              <textarea
                rows={12}
                maxLength={20000}
                value={choice ?? ""}
                onChange={(e) => selectAnswer(e.target.value)}
                placeholder="Write your answer here…"
              />
              <small>{(choice ?? "").length} / 20,000 characters</small>
            </label>
          ) : (
            <div className="cbt-options">
              {options.map((o: any) => (
                <button
                  key={o.key}
                  className={`cbt-option ${choice === o.key ? "chosen" : ""}`}
                  onClick={() => selectAnswer(o.key)}
                >
                  <i>{o.key}</i>
                  <span>{o.text}</span>
                  {choice === o.key && <Check size={17} />}
                </button>
              ))}
            </div>
          )}
          <div className="cbt-controls">
            <button className="outline-btn" onClick={clearCurrent}>
              Clear response
            </button>
            <div />
            <button
              className="outline-btn"
              disabled={index === 0}
              onClick={() => void goTo(index - 1)}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              className="primary-btn"
              onClick={() =>
                void goTo(Math.min(questions.length - 1, index + 1))
              }
            >
              Save & next <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <aside className="cbt-palette">
          <strong>Question palette</strong>
          <p>
            {answered} answered ·{" "}
            {questions.filter((x) => x.marked_for_review).length} marked for
            review
          </p>
          <div>
            {questions.map((item, i) => (
              <button
                key={item.question_id}
                className={`palette-dot ${index === i ? "current" : ""} ${item.selected_answer ? "answered" : ""} ${item.marked_for_review ? "marked" : ""} ${!item.visited ? "unvisited" : ""}`}
                onClick={() => void goTo(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="palette-legend">
            <span>
              <i className="answered" />
              Answered
            </span>
            <span>
              <i className="marked" />
              Review
            </span>
            <span>
              <i className="unvisited" />
              Not visited
            </span>
          </div>
        </aside>
      </div>
      <footer className="cbt-footer">
        <span>
          Autosave{" "}
          {saveState === "saving"
            ? "in progress"
            : saveState === "error"
              ? "needs attention"
              : "complete"}
        </span>
        <span>
          <ShieldCheck size={14} /> Server-timed attempt
        </span>
        <button className="primary-btn" onClick={() => void submitCurrent()}>
          Submit test
        </button>
      </footer>
    </div>
  );
}
function ResultView({ result, onBack }: { result: any; onBack: () => void }) {
  const r = result.result;
  return (
    <div className="result-workspace">
      <div className="student-welcome">
        <div>
          <div className="eyebrow">TEST SUBMITTED</div>
          <h1>Your result</h1>
          <p>
            {r.status === "auto_submitted"
              ? "This attempt was submitted when the server timer expired."
              : "Your answers have been scored."}
          </p>
        </div>
        <button className="outline-btn" onClick={onBack}>
          Back to performance
        </button>
      </div>
      <div className="stats-grid">
        {[
          ["Score", `${r.score} / ${r.max_score}`],
          ["Correct", r.correct_count],
          ["Wrong", r.wrong_count],
          ["Unattempted", r.unanswered_count],
          ["Pending review", r.pending_review_count ?? 0],
          [
            "Accuracy",
            `${Number(r.correct_count + r.wrong_count) ? ((r.correct_count / (r.correct_count + r.wrong_count)) * 100).toFixed(1) : 0}%`,
          ],
          ["Time taken", `${Math.round(r.elapsed_seconds / 60)} min`],
        ].map(([k, v]) => (
          <div className="stat-card" key={k}>
            <span className="stat-label">{k}</span>
            <div className="stat-value">{v}</div>
          </div>
        ))}
      </div>
      <div className="panel admin-panel">
        <h2>Section analysis</h2>
        {result.sections?.map((s: any) => (
          <div className="history-row" key={s.section_id}>
            <div>
              <strong>{s.section_name}</strong>
              <span>
                {s.correct_count} correct · {s.wrong_count} wrong ·{" "}
                {s.attempted_count} attempted
              </span>
            </div>
            <b>
              {s.score} · {Number(s.accuracy).toFixed(1)}%
            </b>
          </div>
        ))}
      </div>
      {result.review?.length > 0 && (
        <div className="panel admin-panel">
          <h2>Question review and explanations</h2>
          {result.review.map((q: any, i: number) => (
            <article className="result-review" key={q.id}>
              <span>
                Question {i + 1} · {q.topic_name} · {q.difficulty}
              </span>
              <h3>{q.question_text}</h3>
              <PassageBlock
                title={q.passage_title}
                text={q.passage_text}
                language={q.passage_language}
                imageUrl={q.passage_image_url}
              />
              {q.image_url && (
                <img
                  className="question-illustration"
                  src={q.image_url}
                  alt="Question illustration"
                  loading="lazy"
                />
              )}
              {q.question_type === "descriptive" ? (
                <div className="descriptive-result">
                  <strong>Your submitted response</strong>
                  <pre>{q.selected_answer ?? "No response"}</pre>
                  {q.manual_score === null ? (
                    <span>
                      Awaiting evaluator review · {q.max_marks ?? ""} marks
                    </span>
                  ) : (
                    <>
                      <b>Score: {q.manual_score} marks</b>
                      {q.grader_comment && <p>{q.grader_comment}</p>}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    Your answer: <b>{q.selected_answer ?? "Unanswered"}</b> ·
                    Correct answer: <b>{q.correct_answer}</b>
                  </div>
                  <p>{q.explanation || "No explanation has been added."}</p>
                </>
              )}
              <small>Time spent: {q.time_spent_seconds} sec</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
function PracticeRunner({
  practice,
  index,
  setIndex,
  choice,
  setChoice,
  review,
  onAnswer,
  onSelect,
  busy,
  onBookmark,
  bookmarks,
  onExit,
}: {
  practice: any;
  index: number;
  setIndex: (i: number) => void;
  choice: string;
  setChoice: (value: string) => void;
  review: any;
  onAnswer: (key: string) => void;
  onSelect: (index: number) => void;
  busy: boolean;
  onBookmark: (id: string) => void;
  bookmarks: Set<string>;
  onExit: () => void;
}) {
  const q = practice.questions[index];
  const options =
    typeof q.options === "string" ? JSON.parse(q.options) : q.options;
  const descriptive = q.question_type === "descriptive";
  return (
    <div className="panel practice-runner">
      <div className="student-welcome">
        <div>
          <div className="eyebrow">PRACTICE · {q.topic_name}</div>
          <h1>
            Question {index + 1} of {practice.questions.length}
          </h1>
          <p>
            {descriptive
              ? "Write your response, then submit it for evaluator review."
              : "Answer feedback appears immediately, with an explanation."}
          </p>
        </div>
        <button className="outline-btn" onClick={onExit}>
          End practice
        </button>
      </div>
      <PassageBlock
        title={q.passage_title}
        text={q.passage_text}
        language={q.passage_language}
        imageUrl={q.passage_image_url}
      />
      <h2>{q.question_text}</h2>
      {q.image_url && (
        <img
          className="question-illustration"
          src={q.image_url}
          alt="Question illustration"
        />
      )}
      {descriptive ? (
        <label className="descriptive-response">
          <span>Your response</span>
          <textarea
            rows={10}
            maxLength={20000}
            value={choice}
            disabled={Boolean(review) || busy}
            onChange={(e) => setChoice(e.target.value)}
            placeholder="Write your answer here…"
          />
          <button
            type="button"
            className="primary-btn"
            disabled={!choice.trim() || Boolean(review) || busy}
            onClick={() => onAnswer(choice)}
          >
            {busy ? "Submitting…" : "Submit written response"}
          </button>
        </label>
      ) : (
        <div className="cbt-options">
          {options.map((o: any) => (
            <button
              key={o.key}
              disabled={Boolean(review) || busy}
              className={`cbt-option ${choice === o.key ? "chosen" : ""}`}
              onClick={() => onAnswer(o.key)}
            >
              <i>{o.key}</i>
              <span>{o.text}</span>
            </button>
          ))}
        </div>
      )}
      {review &&
        (descriptive ? (
          <div className="descriptive-result">
            <strong>Written response submitted</strong>
            <pre>{review.selected_answer}</pre>
            {review.manual_score == null ? (
              <span>Pending review by an evaluator · {review.marks} marks</span>
            ) : (
              <>
                <b>
                  Score: {review.manual_score} / {review.marks} marks
                </b>
                {review.grader_comment && <p>{review.grader_comment}</p>}
              </>
            )}
            {review.grading_rubric && (
              <details>
                <summary>Evaluation rubric</summary>
                <p>{review.grading_rubric}</p>
              </details>
            )}
          </div>
        ) : (
          <div
            className={
              review.is_correct ? "feedback-correct" : "feedback-wrong"
            }
          >
            <strong>
              {review.is_correct ? "Correct" : "Not quite"} · Answer{" "}
              {review.correct_answer}
            </strong>
            <p>{review.explanation || "No explanation has been added yet."}</p>
          </div>
        ))}
      <div className="cbt-controls">
        <button className="outline-btn" onClick={() => onBookmark(q.id)}>
          <Bookmark
            size={14}
            fill={bookmarks.has(q.id) ? "currentColor" : "none"}
          />{" "}
          {bookmarks.has(q.id) ? "Bookmarked" : "Bookmark"}
        </button>
        <div />
        <button
          className="outline-btn"
          disabled={!index}
          onClick={() => onSelect(index - 1)}
        >
          Previous
        </button>
        <button
          className="primary-btn"
          disabled={index === practice.questions.length - 1}
          onClick={() => onSelect(index + 1)}
        >
          Next question <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="form-field">
      {label}
      <input
        type="number"
        min="1"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
