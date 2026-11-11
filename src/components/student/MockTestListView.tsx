import { ArrowRight, Clock3, Play } from "lucide-react";
import { ExamOptGroups } from "../../utils/examCategories";

interface MockTestListViewProps {
  tests: any[];
  exams: any[];
  examFilter: string;
  setExamFilter: (examId: string) => void;
  busy: boolean;
  onStartAttempt: (testId: string) => void;
}

export function MockTestListView({
  tests,
  exams,
  examFilter,
  setExamFilter,
  busy,
  onStartAttempt,
}: MockTestListViewProps) {
  const visibleTests = examFilter
    ? tests.filter((t) => t.exam_id === examFilter)
    : tests;

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
        {exams.length > 0 && (
          <select
            className="period-select"
            aria-label="Filter mock tests by exam"
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
          >
            <option value="">All exams ({exams.length})</option>
            <ExamOptGroups
              exams={exams}
              getKey={(e: any) => e.id}
              getValue={(e: any) => e.id}
              getLabel={(e: any) => e.name}
            />
          </select>
        )}
      </div>
      {visibleTests.length ? (
        visibleTests.map((t) => (
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
