import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  busy: boolean;
  error: string;
  notice: string;
  onSubmit: (credentials: { email: string; password: string }) => void;
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
}

export function LoginForm({
  busy,
  error,
  notice,
  onSubmit,
  onNavigateRegister,
  onNavigateForgot,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="auth-overline">WELCOME TO HHK</span>
      <h2>Sign in to your account</h2>
      <p>Continue your banking exam preparation.</p>

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

      <label>
        Password
        <div className="auth-password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={1}
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
      </label>

      <button
        className="auth-forgot"
        type="button"
        onClick={onNavigateForgot}
      >
        Forgot password?
      </button>

      <button className="primary-btn auth-submit" disabled={busy}>
        {busy ? "Please wait…" : "Sign in"}
      </button>

      <div className="auth-switch">
        New to HHK?{" "}
        <button type="button" onClick={onNavigateRegister}>
          Create an account
        </button>
      </div>

      <small className="auth-note">
        Your profile, attempts, and results are private to your account.
      </small>
    </form>
  );
}
