import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { PassageBlock } from "./PassageBlock";

export function DailyChallengeView({
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
