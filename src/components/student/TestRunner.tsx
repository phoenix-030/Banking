import { useEffect, useRef } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { PassageBlock } from "./PassageBlock";

export function TestRunner({
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
