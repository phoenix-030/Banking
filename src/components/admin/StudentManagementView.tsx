interface StudentManagementViewProps {
  students: any[];
  search: string;
  busy: boolean;
  onSearchChange: (search: string) => void;
  onUpdateStudent: (id: string, input: object) => Promise<void>;
}

export function StudentManagementView({
  students,
  search,
  busy,
  onSearchChange,
  onUpdateStudent,
}: StudentManagementViewProps) {
  return (
    <section className="panel admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="section-kicker">ACCOUNT MANAGEMENT</span>
          <h2>Student accounts</h2>
        </div>
        <input
          className="admin-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Find a student"
        />
      </div>
      <div className="section-table-wrap">
        <table className="section-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Target exam</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Account action</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {students.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.target_exam ?? "—"}</td>
                <td>{u.is_active ? "Active" : "Disabled"}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="outline-btn admin-action"
                    onClick={() =>
                      onUpdateStudent(u.id, { isActive: !u.is_active })
                    }
                  >
                    {u.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
                <td>
                  <button
                    className="outline-btn admin-action"
                    onClick={() => {
                      if (confirm(`Change ${u.full_name}'s role?`)) {
                        onUpdateStudent(u.id, {
                          role: u.role === "admin" ? "student" : "admin",
                        });
                      }
                    }}
                  >
                    {u.role}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!students.length && !busy && (
        <div className="empty-questions">No student accounts found.</div>
      )}
    </section>
  );
}
