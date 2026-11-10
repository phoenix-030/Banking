import { Download } from "lucide-react";

interface AttemptReportsViewProps {
  reports: any[];
  descriptiveResponses: any[];
  gradingDrafts: Record<string, { score: string; comment: string }>;
  busy: boolean;
  onExportReports: () => void;
  onDraftChange: (key: string, field: "score" | "comment", val: string) => void;
  onGradeResponse: (response: any) => Promise<void>;
}

export function AttemptReportsView({
  reports,
  descriptiveResponses,
  gradingDrafts,
  busy,
  onExportReports,
  onDraftChange,
  onGradeResponse,
}: AttemptReportsViewProps) {
  return (
    <section className="panel admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="section-kicker">ATTEMPT REPORTING</span>
          <h2>Student results</h2>
        </div>
        <button className="outline-btn admin-action" onClick={onExportReports}>
          <Download size={14} /> Download CSV
        </button>
      </div>

      <div className="section-table-wrap">
        <table className="section-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam / test</th>
              <th>Score</th>
              <th>Correct</th>
              <th>Wrong</th>
              <th>Unattempted</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.full_name}
                  <br />
                  {r.email}
                </td>
                <td>
                  {r.exam_name}
                  <br />
                  {r.test_name}
                </td>
                <td>
                  {r.score}/{r.max_score}
                </td>
                <td>{r.correct_count}</td>
                <td>{r.wrong_count}</td>
                <td>{r.unanswered_count}</td>
                <td>
                  {r.submitted_at
                    ? new Date(r.submitted_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!reports.length && !busy && (
        <div className="empty-questions">No submitted attempts to report yet.</div>
      )}

      <div className="admin-panel-heading">
        <div>
          <span className="section-kicker">MANUAL EVALUATION</span>
          <h2>
            Descriptive responses awaiting review{" "}
            <span className="question-count">{descriptiveResponses.length}</span>
          </h2>
        </div>
      </div>

      {descriptiveResponses.map((response: any) => {
        const key = `${response.practice_session_id ?? response.attempt_id}:${response.question_id}`;
        const draft = gradingDrafts[key] ?? { score: "", comment: "" };

        return (
          <article className="grading-card" key={key}>
            <div className="saved-question-meta">
              <span>
                {response.student_name} · {response.email}
              </span>
              <span>
                {response.exam_name} · {response.test_name} ·{" "}
                {response.response_type === "practice" ? "Practice" : "Mock test"}
              </span>
              <span>
                Submitted {new Date(response.submitted_at).toLocaleString()}
              </span>
            </div>
            <h3>{response.question_text}</h3>
            <pre>{response.response}</pre>
            {response.grading_rubric && (
              <details>
                <summary>Grading rubric</summary>
                <p>{response.grading_rubric}</p>
              </details>
            )}
            <div className="grading-controls">
              <label className="form-field">
                Score (0–{response.max_marks})
                <input
                  type="number"
                  min="0"
                  max={response.max_marks}
                  step="0.01"
                  value={draft.score}
                  onChange={(e) => onDraftChange(key, "score", e.target.value)}
                />
              </label>
              <label className="form-field">
                Feedback for the aspirant
                <textarea
                  rows={2}
                  maxLength={5000}
                  value={draft.comment}
                  onChange={(e) => onDraftChange(key, "comment", e.target.value)}
                />
              </label>
              <button
                className="primary-btn"
                disabled={busy}
                onClick={() => void onGradeResponse(response)}
              >
                Save grade
              </button>
            </div>
          </article>
        );
      })}
      {!descriptiveResponses.length && !busy && (
        <div className="empty-questions">
          No descriptive answers are waiting for review.
        </div>
      )}
    </section>
  );
}
