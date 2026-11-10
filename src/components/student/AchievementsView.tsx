import { Trophy } from "lucide-react";

interface AchievementsViewProps {
  achievements: Array<{
    code: string;
    earned_at?: string | null;
    name: string;
    description: string;
  }>;
}

export function AchievementsView({ achievements }: AchievementsViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">MILESTONES</div>
          <h1>Achievements</h1>
          <p>Keep preparing to unlock new milestones.</p>
        </div>
      </div>
      <div className="stats-grid">
        {achievements.map((a) => (
          <div className="stat-card" key={a.code}>
            <span className="stat-icon peach">
              <Trophy size={17} />
            </span>
            <span className="stat-label">
              {a.earned_at ? "UNLOCKED" : "LOCKED"}
            </span>
            <div className="stat-value achievement-title">{a.name}</div>
            <p>{a.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
