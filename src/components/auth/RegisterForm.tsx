import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface RegisterFormProps {
  busy: boolean;
  error: string;
  notice: string;
  onSubmit: (data: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => void;
  onNavigateLogin: () => void;
}

export function RegisterForm({
  busy,
  error,
  notice,
  onSubmit,
  onNavigateLogin,
}: RegisterFormProps) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      fullName,
      mobile,
      email,
      password,
      passwordConfirmation,
    });
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="auth-overline">WELCOME TO HHK</span>
      <h2>Create your student account</h2>
      <p>Start building a focused preparation routine.</p>

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
        Full name
        <input
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>

      <label>
        Mobile number
        <input
          autoComplete="tel"
          required
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
      </label>

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
        {busy ? "Please wait…" : "Create account"}
      </button>

      <div className="auth-switch">
        Already have an account?{" "}
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
