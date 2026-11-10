import { useState } from "react";

interface ForgotPasswordFormProps {
  busy: boolean;
  error: string;
  notice: string;
  onSubmit: (email: string) => void;
  onNavigateLogin: () => void;
}

export function ForgotPasswordForm({
  busy,
  error,
  notice,
  onSubmit,
  onNavigateLogin,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(email);
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="auth-overline">WELCOME TO HHK</span>
      <h2>Reset your password</h2>
      <p>We will send reset instructions if an account matches.</p>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="auth-notice" role="status">
          {notice}
        </div>
      )}

      <label>
        Email address
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <button className="primary-btn auth-submit" disabled={busy}>
        {busy ? "Please wait…" : "Send reset instructions"}
      </button>

      <div className="auth-switch">
        Remembered your password?{" "}
        <button type="button" onClick={onNavigateLogin}>
          Sign in
        </button>
      </div>

      <small className="auth-note">
        Your profile, attempts, and results are private to your account.
      </small>
    </form>
  );
}
