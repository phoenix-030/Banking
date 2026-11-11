import { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export interface StreakDayItem {
  date: string;
  label: string;
  count: number;
  active: boolean;
  isToday: boolean;
}

export interface AchievementItem {
  code: string;
  name: string;
  description: string;
  category: "streak" | "practice" | "mock" | "rank";
  earned_at?: string | null;
  current: number;
  target: number;
  percent: number;
  progressText: string;
  statusLabel: string;
  actionPage: string;
  actionLabel: string;
}

export interface AchievementsPayload {
  streak: {
    currentDays: number;
    bestDays: number;
    studiedToday: boolean;
    status: "active_today" | "at_risk" | "inactive";
    lastActivityDate: string | null;
    todayQuestions: number;
    dailyGoal: number;
    weekActiveDays: number;
    weeklyActivity: StreakDayItem[];
  };
  liveStats: {
    totalQuestions: number;
    completedMocks: number;
    bestMockAccuracy: number;
    overallAccuracy: number;
    bestRank: number | null;
    unlockedCount: number;
    totalMilestones: number;
    completionPercent: number;
  };
  achievements: AchievementItem[];
  serverNow: string;
}

interface AchievementsViewProps {
  data: AchievementsPayload | null;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigate: (page: string) => void;
}

function getCategoryIcon(category: AchievementItem["category"], unlocked: boolean) {
  if (unlocked) return Trophy;
  if (category === "streak") return Flame;
  if (category === "mock") return Target;
  if (category === "rank") return Award;
  return Zap;
}

function formatEarnedDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AchievementsView({
  data,
  refreshing,
  onRefresh,
  onNavigate,
}: AchievementsViewProps) {
  const [filter, setFilter] = useState<"all" | "in_progress" | "unlocked">(
    "all",
  );

  const achievements = data?.achievements ?? [];
  const streak = data?.streak;
  const liveStats = data?.liveStats;

  const counts = useMemo(() => {
    const unlocked = achievements.filter((a) => Boolean(a.earned_at)).length;
    return {
      all: achievements.length,
      unlocked,
      inProgress: achievements.length - unlocked,
    };
  }, [achievements]);

  const filtered = useMemo(() => {
    if (filter === "unlocked")
      return achievements.filter((a) => Boolean(a.earned_at));
    if (filter === "in_progress")
      return achievements.filter((a) => !a.earned_at);
    return achievements;
  }, [achievements, filter]);

  const dailyGoal = streak?.dailyGoal ?? 10;
  const todayQuestions = streak?.todayQuestions ?? 0;
  const dailyGoalPercent = Math.min(
    100,
    Math.round((todayQuestions / dailyGoal) * 100),
  );
  const lastSyncedLabel = data?.serverNow
    ? new Date(data.serverNow).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Connecting…";

  const statusPill =
    streak?.status === "active_today"
      ? { label: "Active today", cls: "active" }
      : streak?.status === "at_risk"
        ? { label: "Keep alive today", cls: "risk" }
        : { label: "Start today", cls: "idle" };

  return (
    <>
      <div className="student-welcome achievements-welcome">
        <div>
          <div className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            LIVE MILESTONES &amp; STREAKS
          </div>
          <h1>Streaks &amp; Achievements</h1>
          <p>
            {liveStats
              ? `${liveStats.unlockedCount} of ${liveStats.totalMilestones} milestones unlocked · ${
                  streak?.currentDays
                    ? `${streak.currentDays}-day consecutive study streak`
                    : "Answer a question today to start your streak"
                }`
              : "Loading live streak and milestone progress…"}
          </p>
        </div>

        <div className="achievements-toolbar">
          <span className="achievements-sync" title="Updates live as you study">
            <span className="live-dot" aria-hidden="true" />
            Synced {lastSyncedLabel}
          </span>
          <button
            type="button"
            className="outline-btn admin-action"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      {streak && liveStats && (
        <div className="achievements-hero">
          <section className="panel streak-hero-panel">
            <div className="streak-hero-top">
              <div className="streak-count-row">
                <span className={`streak-hero-badge ${statusPill.cls}`}>
                  <Flame size={22} fill="currentColor" />
                </span>
                <div>
                  <span className="section-kicker">LIVE STUDY STREAK</span>
                  <div className="streak-headline">
                    <strong>
                      {streak.currentDays}{" "}
                      {streak.currentDays === 1 ? "Day" : "Days"}
                    </strong>
                    <span className={`streak-status-pill ${statusPill.cls}`}>
                      {streak.status === "active_today" && (
                        <CheckCircle2 size={13} />
                      )}
                      {statusPill.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="streak-meta-chips">
                <span>Best streak: <b>{streak.bestDays}d</b></span>
                <span>This week: <b>{streak.weekActiveDays}/7</b></span>
                <span>Today: <b>{streak.todayQuestions} solved</b></span>
              </div>
            </div>

            <div className="streak-week-strip" aria-label="Last 7 days activity">
              {streak.weeklyActivity.map((day) => (
                <div
                  key={day.date}
                  className={`streak-day-cell ${day.active ? "active" : ""} ${
                    day.isToday ? "today" : ""
                  }`}
                  title={`${day.date}: ${day.count} question${
                    day.count === 1 ? "" : "s"
                  } answered`}
                >
                  <span className="streak-day-name">
                    {day.isToday ? "Today" : day.label}
                  </span>
                  <div className="streak-day-dot">
                    {day.active ? (
                      <Flame size={15} fill="currentColor" />
                    ) : (
                      <i />
                    )}
                  </div>
                  <small className="streak-day-count">
                    {day.count > 0 ? `${day.count}q` : "—"}
                  </small>
                </div>
              ))}
            </div>

            <div className="daily-goal-box">
              <div className="daily-goal-head">
                <span>
                  Daily goal: <strong>{todayQuestions}</strong> / {dailyGoal}{" "}
                  questions today
                </span>
                <b>
                  {dailyGoalPercent >= 100
                    ? "Goal completed!"
                    : `${dailyGoalPercent}%`}
                </b>
              </div>
              <div className="focus-meter">
                <i
                  className={dailyGoalPercent >= 100 ? "mint" : "blue"}
                  style={{ width: `${dailyGoalPercent}%` }}
                />
              </div>
              <div className="daily-goal-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onNavigate("Daily challenge")}
                >
                  Daily challenge <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="outline-btn admin-action"
                  onClick={() => onNavigate("Practice")}
                >
                  Topic practice <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>

          <section className="panel milestone-summary-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">OVERALL MILESTONES</span>
                <h2>Live preparation telemetry</h2>
              </div>
              <span className="milestone-overall-chip">
                {liveStats.unlockedCount} / {liveStats.totalMilestones}
              </span>
            </div>

            <div className="milestone-total-bar">
              <div className="focus-meter">
                <i
                  className="mint"
                  style={{ width: `${liveStats.completionPercent}%` }}
                />
              </div>
              <span>{liveStats.completionPercent}% milestones completed</span>
            </div>

            <div className="mini-telemetry-grid">
              <div className="mini-telemetry-item">
                <span>Questions solved</span>
                <strong>{liveStats.totalQuestions}</strong>
              </div>
              <div className="mini-telemetry-item">
                <span>Mocks submitted</span>
                <strong>{liveStats.completedMocks}</strong>
              </div>
              <div className="mini-telemetry-item">
                <span>Best mock accuracy</span>
                <strong>{liveStats.bestMockAccuracy}%</strong>
                {liveStats.completedMocks === 0 &&
                  liveStats.overallAccuracy > 0 && (
                    <small>Practice: {liveStats.overallAccuracy}%</small>
                  )}
              </div>
              <div className="mini-telemetry-item">
                <span>Best rank</span>
                <strong>
                  {liveStats.bestRank !== null ? `#${liveStats.bestRank}` : "—"}
                </strong>
                {liveStats.bestRank === null && <small>Submit a mock</small>}
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="milestone-filter-row" role="tablist" aria-label="Filter milestones">
        <button
          type="button"
          className={`milestone-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All milestones ({counts.all})
        </button>
        <button
          type="button"
          className={`milestone-filter-btn ${
            filter === "in_progress" ? "active" : ""
          }`}
          onClick={() => setFilter("in_progress")}
        >
          In progress ({counts.inProgress})
        </button>
        <button
          type="button"
          className={`milestone-filter-btn ${
            filter === "unlocked" ? "active" : ""
          }`}
          onClick={() => setFilter("unlocked")}
        >
          Unlocked ({counts.unlocked})
        </button>
      </div>

      <div className="stats-grid achievements-grid">
        {filtered.map((a) => {
          const unlocked = Boolean(a.earned_at);
          const Icon = getCategoryIcon(a.category, unlocked);
          const toneClass = unlocked
            ? "is-unlocked"
            : a.percent > 0
              ? "is-live"
              : "is-ready";
          const iconTone = unlocked
            ? "mint"
            : a.category === "streak"
              ? "peach"
              : "lavender";
          const meterTone = unlocked
            ? "mint"
            : a.category === "streak"
              ? "amber"
              : "blue";

          return (
            <div className={`stat-card achievement-card ${toneClass}`} key={a.code}>
              <div className="achievement-card-top">
                <span className={`stat-icon ${iconTone}`}>
                  <Icon size={17} />
                </span>
                <span className={`achievement-badge ${toneClass}`}>
                  {unlocked
                    ? `UNLOCKED${
                        formatEarnedDate(a.earned_at)
                          ? ` · ${formatEarnedDate(a.earned_at)}`
                          : ""
                      }`
                    : a.percent > 0
                      ? `LIVE · ${a.percent}%`
                      : "UP NEXT"}
                </span>
              </div>

              <div className="stat-value achievement-title">{a.name}</div>
              <p className="achievement-desc">{a.description}</p>

              <div className="achievement-progress-wrap">
                <div className="achievement-progress-labels">
                  <span>{a.progressText}</span>
                  <b>{a.percent}%</b>
                </div>
                <div className="focus-meter">
                  <i className={meterTone} style={{ width: `${a.percent}%` }} />
                </div>
              </div>

              {!unlocked && (
                <button
                  type="button"
                  className="achievement-action-link"
                  onClick={() => onNavigate(a.actionPage)}
                >
                  {a.actionLabel} <ArrowRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {data && !filtered.length && (
        <div className="panel empty-questions">
          <strong>
            {filter === "unlocked"
              ? "No unlocked milestones yet"
              : "All milestones unlocked!"}
          </strong>
          <span>
            {filter === "unlocked"
              ? "Answer your first question in Practice or Daily challenge to unlock your first badge immediately."
              : "Incredible consistency across your banking preparation."}
          </span>
        </div>
      )}
    </>
  );
}
