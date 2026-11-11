import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Maximize2,
  MousePointerClick,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PassageBlock } from "./PassageBlock";
import {
  activateExamTabLock,
  requestExamFullscreen,
} from "../../utils/examLock";

const MAX_TAB_VIOLATIONS = 3;

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
  onAutoSubmit,
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
  onAutoSubmit: () => void;
  onError: (s: string) => void;
}) {
  const q = questions[index];
  const viewedAt = useRef(Date.now());
  const baseSeconds = useRef(0);
  const choiceRef = useRef(choice);
  const reviewRef = useRef(review);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onErrorRef = useRef(onError);
  choiceRef.current = choice;
  reviewRef.current = review;
  onAutoSubmitRef.current = onAutoSubmit;
  onErrorRef.current = onError;
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [violations, setViolations] = useState(0);
  const [proctorAlert, setProctorAlert] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(() =>
    Boolean(typeof document !== "undefined" && document.fullscreenElement),
  );
  const [camClock, setCamClock] = useState(() =>
    new Date().toLocaleTimeString(),
  );
  const lastViolationAt = useRef(0);
  const keyboardNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const triggeredAutoSubmit = useRef(false);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCamClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const recordViolation = (reason: string) => {
      const now = Date.now();
      if (now - lastViolationAt.current < 800 || triggeredAutoSubmit.current) {
        return;
      }
      lastViolationAt.current = now;
      setViolations((prev) => {
        const next = prev + 1;
        if (next >= MAX_TAB_VIOLATIONS && !triggeredAutoSubmit.current) {
          triggeredAutoSubmit.current = true;
          onErrorRef.current(
            "Multiple tab or window switches detected. Your exam has been automatically submitted.",
          );
          onAutoSubmitRef.current();
        } else {
          setProctorAlert(
            `Proctor warning (${next}/${MAX_TAB_VIOLATIONS}): ${reason}. Exam will auto-submit after ${MAX_TAB_VIOLATIONS} violations.`,
          );
        }
        return next;
      });
    };

    const releaseTabLock = activateExamTabLock(attempt.test_name, () => {
      recordViolation("Companion HHK tab opened and locked automatically");
    });

    const showKeyboardNotice = () => {
      setProctorAlert(
        "Keyboard access is disabled during the exam. Please use your mouse only.",
      );
      if (keyboardNoticeTimer.current) {
        clearTimeout(keyboardNoticeTimer.current);
      }
      keyboardNoticeTimer.current = setTimeout(() => {
        setProctorAlert("");
      }, 3000);
    };

    const blockKeyboard = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.type === "keydown") {
        showKeyboardNotice();
      }
      return false;
    };

    const blockClipboardOrMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blurOnMouseUp = () => {
      window.requestAnimationFrame(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("Tab switch or browser minimize detected");
      }
    };

    const onWindowBlur = () => {
      recordViolation("Window focus left the exam screen");
    };

    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
    };

    window.addEventListener("keydown", blockKeyboard, { capture: true });
    window.addEventListener("keyup", blockKeyboard, { capture: true });
    window.addEventListener("keypress", blockKeyboard, { capture: true });
    document.addEventListener("contextmenu", blockClipboardOrMenu, {
      capture: true,
    });
    document.addEventListener("copy", blockClipboardOrMenu, { capture: true });
    document.addEventListener("cut", blockClipboardOrMenu, { capture: true });
    document.addEventListener("paste", blockClipboardOrMenu, { capture: true });
    document.addEventListener("dragstart", blockClipboardOrMenu, {
      capture: true,
    });
    document.addEventListener("mouseup", blurOnMouseUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      releaseTabLock();
      if (keyboardNoticeTimer.current) {
        clearTimeout(keyboardNoticeTimer.current);
      }
      window.removeEventListener("keydown", blockKeyboard, { capture: true });
      window.removeEventListener("keyup", blockKeyboard, { capture: true });
      window.removeEventListener("keypress", blockKeyboard, { capture: true });
      document.removeEventListener("contextmenu", blockClipboardOrMenu, {
        capture: true,
      });
      document.removeEventListener("copy", blockClipboardOrMenu, {
        capture: true,
      });
      document.removeEventListener("cut", blockClipboardOrMenu, {
        capture: true,
      });
      document.removeEventListener("paste", blockClipboardOrMenu, {
        capture: true,
      });
      document.removeEventListener("dragstart", blockClipboardOrMenu, {
        capture: true,
      });
      document.removeEventListener("mouseup", blurOnMouseUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [attempt.id, attempt.test_name]);

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
    <div
      className="cbt-screen"
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="cbt-header">
        <div>
          <span className="exam-pill">{attempt.test_name}</span>
          <h1>{questions[index].section_name}</h1>
        </div>
        <div className="cbt-proctor-badges">
          <span className="proctor-lock-pill" title="Keyboard input is disabled during the exam">
            <MousePointerClick size={14} /> Mouse-only access
          </span>
          {violations > 0 && (
            <span className="proctor-violation-pill">
              <ShieldAlert size={14} /> Warnings: {violations}/{MAX_TAB_VIOLATIONS}
            </span>
          )}
          {!isFullscreen && (
            <button
              type="button"
              className="outline-btn admin-action proctor-fs-btn"
              onClick={requestExamFullscreen}
            >
              <Maximize2 size={13} /> Enter Fullscreen
            </button>
          )}
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
      {proctorAlert && (
        <div className="proctor-alert-banner" role="alert">
          <ShieldAlert size={16} />
          <span>{proctorAlert}</span>
          <b>
            Violations: {violations}/{MAX_TAB_VIOLATIONS}
          </b>
        </div>
      )}
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
          <section className="proctor-camera-box" aria-label="Proctor camera monitor">
            <div className="proctor-cam-head">
              <span className="proctor-cam-status">
                <i className="proctor-live-dot" />
                CAMERA WATCHING
              </span>
              <small>{camClock}</small>
            </div>
            <div className="proctor-cam-feed">
              <div className="proctor-cam-reticle">
                <Camera size={24} />
              </div>
              <span>PROCTOR MONITOR ACTIVE</span>
            </div>
            <p className="proctor-cam-note">
              Dummy camera monitor · Video is not recorded
            </p>
          </section>
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
          <ShieldCheck size={14} /> Mouse-only · Server-timed · No video recording
        </span>
        <button className="primary-btn" onClick={() => void submitCurrent()}>
          Submit test
        </button>
      </footer>
    </div>
  );
}
