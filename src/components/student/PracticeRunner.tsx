import { Bookmark, ChevronRight } from "lucide-react";
import { PassageBlock } from "./PassageBlock";

export function PracticeRunner({
  practice,
  index,
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
