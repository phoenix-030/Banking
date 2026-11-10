import { useEffect, useMemo, useRef, useState } from "react";
import { DailyChallengeView } from "./components/student/DailyChallengeView";
import { TestRunner } from "./components/student/TestRunner";
import { ResultView } from "./components/student/ResultView";
import { PracticeRunner } from "./components/student/PracticeRunner";
import { StudentOverview } from "./components/student/StudentOverview";
import { PerformanceView } from "./components/student/PerformanceView";
import { MockTestListView } from "./components/student/MockTestListView";
import { PracticeSetupView } from "./components/student/PracticeSetupView";
import { BookmarksView } from "./components/student/BookmarksView";
import { PyqView } from "./components/student/PyqView";
import { StudentCurrentAffairs } from "./components/student/StudentCurrentAffairs";
import { LeaderboardView } from "./components/student/LeaderboardView";
import { AchievementsView } from "./components/student/AchievementsView";
import { StudentProfileView } from "./components/student/StudentProfileView";

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
        <StudentOverview
          user={user}
          summary={summary}
          data={data}
          onNavigate={onNavigate}
        />
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
        <PerformanceView
          summary={summary}
          data={data}
          onReviewAttempt={async (attemptId: string) => {
            try {
              setResult(await api(`/attempts/${attemptId}/results`));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
      {section === "Mock tests" && (
        <MockTestListView
          tests={tests}
          busy={busy}
          onStartAttempt={startAttempt}
        />
      )}
      {section === "Practice" && (
        <PracticeSetupView
          selectedExam={selectedExam}
          setSelectedExam={setSelectedExam}
          sectionId={sectionId}
          setSectionId={setSectionId}
          topicName={topicName}
          setTopicName={setTopicName}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          count={count}
          setCount={setCount}
          catalog={catalog}
          busy={busy}
          onStartPractice={startPractice}
          practiceResponses={practiceResponses}
        />
      )}
      {section === "Bookmarks" && (
        <BookmarksView
          bookmarkedQuestions={bookmarkedQuestions}
          busy={busy}
          startBookmarkedQuestion={startBookmarkedQuestion}
          toggleBookmark={toggleBookmark}
        />
      )}
      {section === "Previous year questions" && (
        <PyqView
          filterExam={filterExam}
          setFilterExam={setFilterExam}
          publishedExams={publishedExams}
          filterStage={filterStage}
          setFilterStage={setFilterStage}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          filterSection={filterSection}
          setFilterSection={setFilterSection}
          filterTopic={filterTopic}
          setFilterTopic={setFilterTopic}
          filterDifficulty={filterDifficulty}
          setFilterDifficulty={setFilterDifficulty}
          pyq={pyq}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
        />
      )}
      {section === "Current affairs" && (
        <StudentCurrentAffairs
          affairCategory={affairCategory}
          setAffairCategory={setAffairCategory}
          affairCategories={affairCategories}
          affairs={affairs}
          affairQuiz={affairQuiz}
          setAffairQuiz={setAffairQuiz}
          answerAffair={answerAffair}
          showAffairQuestion={showAffairQuestion}
          openAffair={openAffair}
        />
      )}
      {section === "Leaderboard" && (
        <LeaderboardView
          period={period}
          setPeriod={setPeriod}
          leaderboard={leaderboard}
        />
      )}
      {section === "Achievements" && (
        <AchievementsView achievements={achievements} />
      )}
      {section === "Profile" && profile && (
        <StudentProfileView
          profile={profile}
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
          profileExams={profileExams}
          profileSaving={profileSaving}
          onSave={async () => {
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
        />
      )}
    </div>
  );
}
