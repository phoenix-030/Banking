interface LeaderboardViewProps {
  period: string;
  setPeriod: (period: string) => void;
  leaderboard: Array<{
    id: string;
    full_name: string;
    best_score: number | string;
    attempts: number | string;
  }>;
}

export function LeaderboardView({
  period,
  setPeriod,
  leaderboard,
}: LeaderboardViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">COMMUNITY</div>
          <h1>Leaderboard</h1>
          <p>Rankings use submitted mock attempts.</p>
        </div>
        <select
          className="period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="overall">Overall</option>
        </select>
      </div>
      <div className="panel admin-panel">
        <div className="section-table-wrap">
          <table className="section-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Aspirant</th>
                <th>Best score</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>{u.full_name}</td>
                  <td>{u.best_score}</td>
                  <td>{u.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!leaderboard.length && (
          <div className="empty-questions">
            Leaderboard entries will appear when mock tests are submitted.
          </div>
        )}
      </div>
    </>
  );
}
