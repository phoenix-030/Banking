import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";

interface StudentOverviewProps {
  user: { fullName: string };
  summary: any;
  data: any;
  onNavigate: (page: string) => void;
}

export function StudentOverview({
  user,
  summary,
  data,
  onNavigate,
}: StudentOverviewProps) {
  const statCards = [
    ["Mock tests attempted", summary.attempts ?? 0, Target],
    ["Questions attempted", summary.questions ?? 0, Activity],
    ["Average score", summary.average_score ?? 0, ShieldCheck],
    ["Overall accuracy", `${summary.accuracy ?? 0}%`, Trophy],
  ];

  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR PREPARATION
          </div>
          <h1>Welcome, {user.fullName.split(" ")[0]}</h1>
          <p>Your progress is built one focused session at a time.</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => onNavigate("Mock tests")}
        >
          Explore mock tests <ArrowRight size={15} />
        </button>
      </div>

      <div className="stats-grid">
        {statCards.map(([label, value, Icon]: any) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon lavender">
              <Icon size={17} />
            </span>
            <span className="stat-label">{label}</span>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="student-panels">
        <section className="panel admin-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">RECENT WORK</span>
              <h2>Recent mock tests</h2>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigate("Performance")}
            >
              View history <ArrowRight size={14} />
            </button>
          </div>
          {data?.recent?.length ? (
            data.recent.map((t: any) => (
              <div className="history-row" key={t.id}>
                <div>
                  <strong>{t.test_name}</strong>
                  <span>
                    {t.exam_name} ·{" "}
                    {new Date(t.started_at).toLocaleDateString()}
                  </span>
                </div>
                <b>
                  {t.score} / {t.max_score}
                </b>
              </div>
            ))
          ) : (
            <div className="empty-questions">
              <strong>No completed mocks yet</strong>
              <span>Choose a published test when you are ready.</span>
            </div>
          )}
        </section>

        <section className="panel admin-panel">
          <div className="section-kicker">FOCUS AREAS</div>
          <h2>Topic accuracy</h2>
          {data?.weakTopics?.length ? (
            data.weakTopics.map((t: any) => (
              <div className="focus-area" key={t.topic_name}>
                <div className="focus-title">
                  <div>
                    <strong>{t.topic_name}</strong>
                    <span>{t.attempts} answers</span>
                  </div>
                  <b>{t.accuracy}%</b>
                </div>
                <div className="focus-meter">
                  <i className="coral" style={{ width: `${t.accuracy}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="empty-questions">
              <span>Practice a few topics to see tailored insights.</span>
            </div>
          )}
          <button
            className="recommend-btn"
            onClick={() => onNavigate("Practice")}
          >
            Start topic practice <ArrowRight size={14} />
          </button>
        </section>
      </div>
    </>
  );
}
