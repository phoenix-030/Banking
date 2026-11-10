import { Bookmark } from "lucide-react";
import { PassageBlock } from "./PassageBlock";

interface PyqViewProps {
  filterExam: string;
  setFilterExam: (v: string) => void;
  publishedExams: any[];
  filterStage: string;
  setFilterStage: (v: string) => void;
  filterYear: string;
  setFilterYear: (v: string) => void;
  filterSection: string;
  setFilterSection: (v: string) => void;
  filterTopic: string;
  setFilterTopic: (v: string) => void;
  filterDifficulty: string;
  setFilterDifficulty: (v: string) => void;
  pyq: any[];
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
}

export function PyqView({
  filterExam,
  setFilterExam,
  publishedExams,
  filterStage,
  setFilterStage,
  filterYear,
  setFilterYear,
  filterSection,
  setFilterSection,
  filterTopic,
  setFilterTopic,
  filterDifficulty,
  setFilterDifficulty,
  pyq,
  bookmarks,
  toggleBookmark,
}: PyqViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">VERIFIED PREVIOUS PAPERS</div>
          <h1>Previous year questions</h1>
          <p>Questions are shown only after admin review and publication.</p>
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
  );
}
