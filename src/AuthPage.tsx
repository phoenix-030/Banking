import { useState } from "react";
import { AuthBrand } from "./components/auth/AuthBrand";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./components/auth/ResetPasswordForm";

export type User = {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: "student" | "admin";
};

type Mode = "login" | "register" | "forgot" | "reset";

export default function AuthPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void;
}) {
  const resetToken =
    new URLSearchParams(window.location.search).get("reset") ?? "";
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : "login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function clearAlerts() {
    setError("");
    setNotice("");
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    clearAlerts();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Unable to reach the server. Please ensure the backend is running on port 3001.",
        );
      }
      onAuthenticated(body.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API unavailable. Start the HHK API server and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(data: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) {
    clearAlerts();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Unable to reach the server. Please ensure the backend is running on port 3001.",
        );
      }
      onAuthenticated(body.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API unavailable. Start the HHK API server and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(email: string) {
    clearAlerts();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Could not request reset. Make sure the backend server is running.",
        );
      }
      setNotice(body.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API unavailable. Start the HHK API server and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(passwords: {
    password: string;
    passwordConfirmation: string;
  }) {
    clearAlerts();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password: passwords.password,
          passwordConfirmation: passwords.passwordConfirmation,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Could not reset the password. Make sure the backend server is running.",
        );
      }
      setNotice(body.message);
      window.history.replaceState({}, "", window.location.pathname);
      setMode("login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API unavailable. Start the HHK API server and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <AuthBrand />
      <section className="auth-side">
        {mode === "login" && (
          <LoginForm
            busy={busy}
            error={error}
            notice={notice}
            onSubmit={handleLogin}
            onNavigateRegister={() => {
              clearAlerts();
              setMode("register");
            }}
            onNavigateForgot={() => {
              clearAlerts();
              setMode("forgot");
            }}
          />
        )}
        {mode === "register" && (
          <RegisterForm
            busy={busy}
            error={error}
            notice={notice}
            onSubmit={handleRegister}
            onNavigateLogin={() => {
              clearAlerts();
              setMode("login");
            }}
          />
        )}
        {mode === "forgot" && (
          <ForgotPasswordForm
            busy={busy}
            error={error}
            notice={notice}
            onSubmit={handleForgotPassword}
            onNavigateLogin={() => {
              clearAlerts();
              setMode("login");
            }}
          />
        )}
        {mode === "reset" && (
          <ResetPasswordForm
            busy={busy}
            error={error}
            notice={notice}
            onSubmit={handleResetPassword}
            onNavigateLogin={() => {
              clearAlerts();
              setMode("login");
            }}
          />
        )}
      </section>
    </main>
  );
}
