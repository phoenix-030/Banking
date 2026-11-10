import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ResetPasswordFormProps {
  busy: boolean;
  error: string;
  notice: string;
  onSubmit: (passwords: {
    password: string;
    passwordConfirmation: string;
  }) => void;
  onNavigateLogin: () => void;
}

export function ResetPasswordForm({
  busy,
  error,
  notice,
  onSubmit,
  onNavigateLogin,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ password, passwordConfirmation });
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="auth-overline">WELCOME TO HHK</span>
      <h2>Choose a new password</h2>
      <p>Choose a strong password you have not used here before.</p>

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
        Password
        <div className="auth-password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <small>Use at least 6 characters.</small>
      </label>

      <label>
        Confirm password
        <div className="auth-password-wrapper">
          <input
            type={showPasswordConfirmation ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            maxLength={128}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPasswordConfirmation((prev) => !prev)}
            aria-label={
              showPasswordConfirmation
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showPasswordConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      <button className="primary-btn auth-submit" disabled={busy}>
        {busy ? "Please wait…" : "Set new password"}
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
