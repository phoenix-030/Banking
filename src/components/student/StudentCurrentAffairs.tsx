import { ArrowRight, ChevronLeft } from "lucide-react";

interface StudentCurrentAffairsProps {
  affairCategory: string;
  setAffairCategory: (cat: string) => void;
  affairCategories: any[];
  affairs: any[];
  affairQuiz: any;
  setAffairQuiz: (quiz: any) => void;
  answerAffair: (key: string) => void;
  showAffairQuestion: (index: number) => void;
  openAffair: (id: string) => void;
}

export function StudentCurrentAffairs({
  affairCategory,
  setAffairCategory,
  affairCategories,
  affairs,
  affairQuiz,
  setAffairQuiz,
  answerAffair,
  showAffairQuestion,
  openAffair,
}: StudentCurrentAffairsProps) {
  return (
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
  );
}
