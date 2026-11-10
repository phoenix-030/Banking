interface AuditLogsViewProps {
  logs: any[];
}

export function AuditLogsView({ logs }: AuditLogsViewProps) {
  return (
    <section className="panel admin-panel">
      <div className="section-kicker">ADMIN ACTIVITY</div>
      <h2>Audit log</h2>
      <div className="section-table-wrap">
        <table className="section-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.actor_name ?? log.actor_email ?? "System"}</td>
                <td>{log.action}</td>
                <td>{log.entity_type}</td>
                <td>{JSON.stringify(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
