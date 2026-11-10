interface PerformanceViewProps {
  summary: any;
  data: any;
  onReviewAttempt: (attemptId: string) => Promise<void>;
}

export function PerformanceView({
  summary,
  data,
  onReviewAttempt,
}: PerformanceViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">PERFORMANCE</div>
          <h1>Your results and progress</h1>
          <p>
            Mock scores use submitted attempts. Overall accuracy includes
            objective answers from mocks, practice, current affairs, and daily
            challenges.
          </p>
        </div>
      </div>
      <div className="stats-grid">
        {[
          ["Tests attempted", summary.attempts ?? 0],
          ["Questions attempted", summary.questions ?? 0],
          ["Average score", summary.average_score ?? 0],
          ["Accuracy", `${summary.accuracy ?? 0}%`],
        ].map(([l, v]) => (
          <div className="stat-card" key={l}>
            <span className="stat-label">{l}</span>
            <div className="stat-value">{v}</div>
          </div>
        ))}
      </div>
      <div className="panel admin-panel">
        <h2>Test history</h2>
        {data?.recent?.map((t: any) => (
          <div className="history-row" key={t.id}>
            <div>
              <strong>{t.test_name}</strong>
              <span>
                {t.exam_name} · {new Date(t.started_at).toLocaleDateString()}
              </span>
            </div>
            <b>
              {t.score}/{t.max_score} · {t.correct_count} right · {t.wrong_count}{" "}
              wrong
            </b>
            <button
              className="outline-btn admin-action"
              onClick={() => onReviewAttempt(t.id)}
            >
              Review
            </button>
          </div>
        ))}
      </div>
      <div className="panel admin-panel">
        <h2>Section accuracy</h2>
        {data?.sections?.map((s: any) => (
          <div className="focus-area" key={s.section_name}>
            <div className="focus-title">
              <div>
                <strong>{s.section_name}</strong>
                <span>{s.questions} questions</span>
              </div>
              <b>{s.accuracy}%</b>
            </div>
            <div className="focus-meter">
              <i className="blue" style={{ width: `${s.accuracy}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="panel admin-panel">
        <h2>Learning activity</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Current affairs answered</span>
            <div className="stat-value">
              {summary.current_affairs_answered ?? 0}
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current affairs accuracy</span>
            <div className="stat-value">
              {summary.current_affairs_accuracy ?? 0}%
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current study streak</span>
            <div className="stat-value">
              {summary.current_streak ?? 0} days
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Best study streak</span>
            <div className="stat-value">{summary.best_streak ?? 0} days</div>
          </div>
        </div>
      </div>
    </>
  );
}
