import { Field } from "../common/Field";

interface CurrentAffairsViewProps {
  categories: any[];
  affairs: any[];
  article: {
    id: string;
    categoryId: string;
    title: string;
    body: string;
    status: string;
  };
  quiz: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  onArticleChange: (article: any) => void;
  onQuizChange: (quiz: any) => void;
  onSaveArticle: () => void;
  onAddAffairQuestion: (affairId: string) => void;
}

export function CurrentAffairsView({
  categories,
  affairs,
  article,
  quiz,
  onArticleChange,
  onQuizChange,
  onSaveArticle,
  onAddAffairQuestion,
}: CurrentAffairsViewProps) {
  return (
    <>
      <section className="panel admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="section-kicker">LEARNING CONTENT</span>
            <h2>{article.id ? "Edit current affairs" : "Add current affairs"}</h2>
          </div>
          <select
            className="affair-status"
            value={article.status}
            onChange={(e) =>
              onArticleChange({ ...article, status: e.target.value })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="question-config">
          <label>
            Category
            <select
              value={article.categoryId}
              onChange={(e) =>
                onArticleChange({ ...article, categoryId: e.target.value })
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Headline"
            value={article.title}
            onChange={(v) => onArticleChange({ ...article, title: v })}
          />
        </div>

        <label className="form-field affair-body">
          Note content
          <textarea
            rows={5}
            value={article.body}
            onChange={(e) =>
              onArticleChange({ ...article, body: e.target.value })
            }
          />
        </label>

        <div className="admin-footer">
          <span>Verify facts and content rights before publication.</span>
          <div>
            <button
              className="outline-btn admin-action"
              onClick={() =>
                onArticleChange({
                  id: "",
                  categoryId: categories[0]?.id ?? "",
                  title: "",
                  body: "",
                  status: "draft",
                })
              }
            >
              Clear form
            </button>
            <button className="primary-btn" onClick={onSaveArticle}>
              Save note
            </button>
          </div>
        </div>
      </section>

      <section className="panel admin-panel">
        <h2>Published and draft notes</h2>
        {affairs.map((a) => (
          <article className="saved-question" key={a.id}>
            <div className="saved-question-meta">
              <span>{a.category}</span>
              <b>{a.status}</b>
            </div>
            <h3>{a.title}</h3>
            <p>{a.body.slice(0, 240)}</p>
            <button
              className="outline-btn admin-action"
              onClick={() =>
                onArticleChange({
                  id: a.id,
                  categoryId: a.category_id,
                  title: a.title,
                  body: a.body,
                  status: a.status,
                })
              }
            >
              Edit note
            </button>

            <div className="quiz-author">
              <h4>Add a quiz question</h4>
              <input
                value={quiz.questionText}
                onChange={(e) =>
                  onQuizChange({ ...quiz, questionText: e.target.value })
                }
                placeholder="Question text"
              />
              {quiz.options.map((value, i) => (
                <div className="option-input" key={i}>
                  <button
                    onClick={() =>
                      onQuizChange({
                        ...quiz,
                        correctAnswer: String.fromCharCode(65 + i),
                      })
                    }
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <input
                    value={value}
                    onChange={(e) =>
                      onQuizChange({
                        ...quiz,
                        options: quiz.options.map((old, j) =>
                          j === i ? e.target.value : old,
                        ),
                      })
                    }
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
              <textarea
                value={quiz.explanation}
                onChange={(e) =>
                  onQuizChange({ ...quiz, explanation: e.target.value })
                }
                placeholder="Explanation"
              />
              <button
                className="outline-btn admin-action"
                onClick={() => onAddAffairQuestion(a.id)}
              >
                Save quiz question (answer {quiz.correctAnswer})
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
