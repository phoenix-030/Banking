import { lazy, Suspense, useEffect, useState } from "react";
import { ExamOptGroups } from "./utils/examCategories";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  X,
} from "lucide-react";
const AdminPanel = lazy(() => import("./AdminPanel"));
const AdminOverview = lazy(() => import("./AdminOverview"));
const AuthPage = lazy(() => import("./AuthPage"));
const StudentWorkspace = lazy(() => import("./StudentWorkspace"));

type User = {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: "student" | "admin";
};
const studentPages = [
  ["Overview", LayoutDashboard],
  ["Daily challenge", Flame],
  ["Practice", BookOpen],
  ["Bookmarks", Bookmark],
  ["Mock tests", Target],
  ["Performance", Activity],
  ["Current affairs", CalendarDays],
  ["Leaderboard", Trophy],
  ["Achievements", ShieldCheck],
  ["Profile", Settings],
] as const;
const adminPages = [
  ["Admin dashboard", LayoutDashboard],
  ["Exam setup", Settings],
  ["Question bank", BookOpen],
  ["Mock tests", Target],
  ["Students", Activity],
  ["Current affairs", CalendarDays],
  ["Reports", ShieldCheck],
  ["Settings", ShieldCheck],
] as const;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => (r.ok ? (await r.json()).user : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }
  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setUser(null);
    setActive("Overview");
  }
  if (loading)
    return (
      <div className="auth-loading">Loading your secure HHK workspace…</div>
    );
  if (!user)
    return (
      <Suspense fallback={<div className="auth-loading">Loading HHK…</div>}>
        <AuthPage
          onAuthenticated={(u) => {
            setUser(u);
            setActive(u.role === "admin" ? "Admin dashboard" : "Overview");
          }}
        />
      </Suspense>
    );
  const pages = user.role === "admin" ? adminPages : studentPages;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/hhk-logo.png" alt="HHK logo" />
          <span className="brand-name">HHK</span>
          <button
            className="mobile-close icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          {user.role === "admin" ? "ADMINISTRATION" : "STUDENT WORKSPACE"}
        </div>
        <nav
          className="main-nav"
          aria-label={
            user.role === "admin" ? "Admin navigation" : "Student navigation"
          }
        >
          {pages.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-link ${active === label ? "active" : ""}`}
              onClick={() => {
                setActive(label);
                setMenuOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {user.role === "student" && (
          <>
            <div className="side-separator" />
            <div className="workspace-label">YOUR PREPARATION</div>
            <TargetExamSelector onToast={flash} />
            <div className="side-separator" />
            <SidebarStreak
              userId={user.id}
              onOpenAchievements={() => {
                setActive("Achievements");
                setMenuOpen(false);
              }}
            />
          </>
        )}
        <div className="sidebar-bottom">
          <button className="profile-row" onClick={signOut}>
            <div className="avatar">
              {user.fullName
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="profile-copy">
              <strong>{user.fullName}</strong>
              <span>
                {user.role === "admin"
                  ? "Administrator · Sign out"
                  : "Student · Sign out"}
              </span>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>HHK</span>
            <ChevronRight size={15} />
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <button
              className="icon-btn notification-btn"
              onClick={() => flash("You are all caught up.")}
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <div className="top-divider" />
            <button
              className="help-btn"
              onClick={() => flash("Help center will be available soon.")}
            >
              <CircleHelp size={17} /> Help
            </button>
          </div>
        </header>
        <div className="content">
          <Suspense
            fallback={
              <div className="auth-loading">Loading your workspace…</div>
            }
          >
            {user.role === "admin" && active === "Exam setup" ? (
              <AdminPanel
                section="Exam setup"
                onToast={flash}
                onNavigate={setActive}
              />
            ) : user.role === "admin" && active === "Question bank" ? (
              <AdminPanel
                section="Question bank"
                onToast={flash}
                onNavigate={setActive}
              />
            ) : user.role === "admin" ? (
              <AdminOverview
                section={active}
                onNavigate={setActive}
                onToast={flash}
              />
            ) : (
              <StudentWorkspace
                section={active}
                user={user}
                onNavigate={setActive}
                onToast={flash}
              />
            )}
          </Suspense>
        </div>
      </main>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function TargetExamSelector({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const [exams, setExams] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/api/exams").then((r) => r.json()),
      fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([e, m]) => {
        setExams(e.exams ?? []);
        setSelected(m.profile?.target_exam_id ?? "");
      })
      .catch(() => setError("Exam list unavailable"));
    const onSync = (event: Event) => {
      const next = (event as CustomEvent<string>).detail ?? "";
      setSelected(next);
    };
    window.addEventListener("hhk:target-exam-updated", onSync);
    return () => window.removeEventListener("hhk:target-exam-updated", onSync);
  }, []);
  async function change(id: string) {
    setSelected(id);
    try {
      const current = await fetch("/api/auth/me", {
        credentials: "include",
      }).then((r) => r.json());
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: current.user.fullName,
          mobile: current.user.mobile,
          targetExamId: id || null,
        }),
      });
      if (!response.ok) throw new Error();
      window.dispatchEvent(
        new CustomEvent("hhk:target-exam-updated", { detail: id }),
      );
      onToast("Target examination saved.");
    } catch {
      setError("Could not save target examination.");
    }
  }
  return (
    <div className="target-card">
      <div className="target-card-top">
        <span className="tiny-label">TARGET EXAM</span>
        <ChevronDown size={15} />
      </div>
      <select
        value={selected}
        onChange={(e) => change(e.target.value)}
        aria-label="Target examination"
      >
        <option value="">Choose target exam</option>
        <ExamOptGroups
          exams={exams}
          getKey={(e) => e.id}
          getValue={(e) => e.id}
          getLabel={(e) => e.name}
        />
      </select>
      <div className="target-date">
        <CalendarDays size={14} />
        {exams.length
          ? `${exams.length} banking exams available`
          : "No active exams in catalogue"}
      </div>
      {error && <small className="target-error">{error}</small>}
    </div>
  );
}

function SidebarStreak({
  userId,
  onOpenAchievements,
}: {
  userId: string;
  onOpenAchievements: () => void;
}) {
  const [streak, setStreak] = useState<{
    currentDays: number;
    bestDays: number;
    studiedToday: boolean;
    todayQuestions: number;
    status: "active_today" | "at_risk" | "inactive";
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/achievements", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (active && d?.streak) setStreak(d.streak);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    window.addEventListener("hhk:activity-updated", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("hhk:activity-updated", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [userId]);

  const days = streak?.currentDays ?? 0;
  const status = streak?.status ?? "inactive";
  const title =
    status === "active_today"
      ? `${days}-day streak active`
      : days > 0
        ? `Keep your ${days}-day streak`
        : "Start your daily streak";
  const subtitle =
    status === "active_today"
      ? `${streak?.todayQuestions ?? 0} solved today · View milestones`
      : days > 0
        ? "Solve 1 question today to extend"
        : "Solve a question to ignite today";

  return (
    <button
      type="button"
      className={`student-streak ${status}`}
      onClick={onOpenAchievements}
      title="Open live streaks and achievements"
    >
      <span>
        <Flame size={17} fill="currentColor" />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
    </button>
  );
}
