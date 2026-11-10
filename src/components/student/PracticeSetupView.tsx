import { ArrowRight } from "lucide-react";
import { Field } from "../common/Field";

interface PracticeSetupViewProps {
  selectedExam: string;
  setSelectedExam: (examId: string) => void;
  sectionId: string;
  setSectionId: (sectionId: string) => void;
  topicName: string;
  setTopicName: (topic: string) => void;
  difficulty: string;
  setDifficulty: (diff: string) => void;
  count: number;
  setCount: (c: number) => void;
  catalog: any[];
  busy: boolean;
  onStartPractice: () => void;
  practiceResponses: any[];
}

export function PracticeSetupView({
  selectedExam,
  setSelectedExam,
  sectionId,
  setSectionId,
  topicName,
  setTopicName,
  difficulty,
  setDifficulty,
  count,
  setCount,
  catalog,
  busy,
  onStartPractice,
  practiceResponses,
}: PracticeSetupViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">STRUCTURED PRACTICE</div>
          <h1>Practice by topic</h1>
          <p>
            Choose a published exam section, topic, difficulty, and question
            count.
          </p>
        </div>
      </div>
      <section className="panel admin-panel practice-setup">
        <div className="question-config">
          <label>
            Exam
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setSectionId("");
                setTopicName("");
              }}
            >
              <option value="">Select exam</option>
              {[
                ...new Map(catalog.map((c) => [c.exam_id, c])).values(),
              ].map((c: any) => (
                <option key={c.exam_id} value={c.exam_id}>
                  {c.exam_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setTopicName("");
              }}
            >
              <option value="">Select section</option>
              {[
                ...new Map(
                  catalog
                    .filter((c) => c.exam_id === selectedExam)
                    .map((c) => [c.section_id, c]),
                ).values(),
              ].map((c: any) => (
                <option key={c.section_id} value={c.section_id}>
                  {c.stage_name} · {c.section_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <select
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
            >
              <option value="">Any topic</option>
              {catalog
                .filter((c) => c.section_id === sectionId && c.topic_name)
                .map((c: any) => (
                  <option key={c.topic_id} value={c.topic_name}>
                    {c.topic_name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <Field
            label="Question count"
            value={String(count)}
            onChange={(v) =>
              setCount(Math.max(1, Math.min(100, Number(v))))
            }
          />
        </div>
        <button
          className="primary-btn"
          disabled={!sectionId || busy}
          onClick={onStartPractice}
        >
          Start practice <ArrowRight size={14} />
        </button>
        <section className="panel admin-panel">
          <h2>Recent practice responses</h2>
          {practiceResponses.map((r: any) => (
            <article
              className="result-review"
              key={`${r.practice_session_id}:${r.question_id}`}
            >
              <span>
                {r.exam_name} · {r.section_name} · {r.topic_name} ·{" "}
                {r.difficulty}
              </span>
              <h3>{r.question_text}</h3>
              <div className="descriptive-result">
                <pre>{r.response}</pre>
                {r.question_type === "descriptive" ? (
                  r.manual_score == null ? (
                    <span>
                      Pending evaluator review · {r.max_marks} marks
                    </span>
                  ) : (
                    <>
                      <b>
                        Score: {r.manual_score} / {r.max_marks} marks
                      </b>
                      {r.grader_comment && <p>{r.grader_comment}</p>}
                    </>
                  )
                ) : (
                  <strong>{r.is_correct ? "Correct" : "Incorrect"}</strong>
                )}
              </div>
            </article>
          ))}
          {!practiceResponses.length && (
            <div className="empty-questions">
              Your submitted practice responses will appear here.
            </div>
          )}
        </section>
      </section>
    </>
  );
}
