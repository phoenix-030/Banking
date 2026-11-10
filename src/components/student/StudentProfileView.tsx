interface StudentProfileViewProps {
  profile: {
    user: {
      email: string;
    };
  };
  profileDraft: {
    fullName: string;
    mobile: string;
    targetExamId: string;
    preparationStatus: string;
  };
  setProfileDraft: (draft: {
    fullName: string;
    mobile: string;
    targetExamId: string;
    preparationStatus: string;
  }) => void;
  profileExams: any[];
  profileSaving: boolean;
  onSave: () => void;
}

export function StudentProfileView({
  profile,
  profileDraft,
  setProfileDraft,
  profileExams,
  profileSaving,
  onSave,
}: StudentProfileViewProps) {
  return (
    <>
      <div className="student-welcome">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1>Your profile</h1>
          <p>Keep your contact details and preparation goal up to date.</p>
        </div>
      </div>
      <section className="panel admin-panel profile-editor">
        <div className="profile-form-grid">
          <label className="form-field">
            Full name
            <input
              value={profileDraft.fullName}
              onChange={(e) =>
                setProfileDraft({
                  ...profileDraft,
                  fullName: e.target.value,
                })
              }
            />
          </label>
          <label className="form-field">
            Email
            <input value={profile.user.email} disabled />
          </label>
          <label className="form-field">
            Mobile number
            <input
              value={profileDraft.mobile}
              onChange={(e) =>
                setProfileDraft({ ...profileDraft, mobile: e.target.value })
              }
            />
          </label>
          <label className="form-field">
            Target examination
            <select
              value={profileDraft.targetExamId}
              onChange={(e) =>
                setProfileDraft({
                  ...profileDraft,
                  targetExamId: e.target.value,
                })
              }
            >
              <option value="">Choose an exam</option>
              {profileExams.map((exam: any) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Preparation status
            <select
              value={profileDraft.preparationStatus}
              onChange={(e) =>
                setProfileDraft({
                  ...profileDraft,
                  preparationStatus: e.target.value,
                })
              }
            >
              <option value="starting">Starting</option>
              <option value="preparing">Preparing</option>
              <option value="revision">Revision</option>
            </select>
          </label>
        </div>
        <div className="admin-footer">
          <span>
            Email address is used to sign in and cannot be changed here.
          </span>
          <button
            className="primary-btn"
            disabled={profileSaving}
            onClick={onSave}
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>
    </>
  );
}
