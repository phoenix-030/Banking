import { ArrowRight } from "lucide-react";
import { PassageBlock } from "./PassageBlock";

interface BookmarksViewProps {
  bookmarkedQuestions: any[];
  busy: boolean;
  startBookmarkedQuestion: (q: any) => void;
  toggleBookmark: (id: string) => void;
}

export function BookmarksView({
  bookmarkedQuestions,
  busy,
  startBookmarkedQuestion,
  toggleBookmark,
}: BookmarksViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">SAVED STUDY SET</div>
          <h1>Bookmarked questions</h1>
          <p>Return to questions you saved and practice any one directly.</p>
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
  );
}
