import { ArrowRight, Clock3, Play } from "lucide-react";

interface MockTestListViewProps {
  tests: any[];
  busy: boolean;
  onStartAttempt: (testId: string) => void;
}

export function MockTestListView({
  tests,
  busy,
  onStartAttempt,
}: MockTestListViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">COMPUTER-BASED MOCKS</div>
          <h1>Choose a mock test</h1>
          <p>
            Published tests use the configured sections, timer, and marking
            rules.
          </p>
        </div>
      </div>
      {tests.length ? (
        tests.map((t) => (
          <div className="panel test-card" key={t.id}>
            <div>
              <span className="exam-pill">
                {t.exam_name} · {t.stage_name}
              </span>
              <h2>{t.name}</h2>
              <p>{t.description || "Timed computer-based mock test"}</p>
              <span>
                <Clock3 size={14} /> {Math.round(t.duration_seconds / 60)}{" "}
                minutes
              </span>
              {t.pattern_cycle && (
                <span className="pattern-cycle-label">
                  Pattern cycle: {t.pattern_cycle}
                </span>
              )}
              {t.pattern_source_url && (
                <a
                  className="pattern-source-link"
                  href={t.pattern_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View official recruitment notice <ArrowRight size={13} />
                </a>
              )}
            </div>
            <button
              className="primary-btn"
              disabled={busy}
              onClick={() => onStartAttempt(t.id)}
            >
              <Play size={14} fill="currentColor" /> Start test
            </button>
          </div>
        ))
      ) : (
        <div className="panel empty-questions">
          <strong>No published tests available</strong>
          <span>
            Mock tests will appear here once an administrator publishes them.
          </span>
        </div>
      )}
    </>
  );
}
