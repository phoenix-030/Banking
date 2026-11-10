import { PassageBlock } from "./PassageBlock";

export function ResultView({
  result,
  onBack,
}: {
  result: any;
  onBack: () => void;
}) {
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
