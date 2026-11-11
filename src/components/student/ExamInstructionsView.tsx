import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Clock3,
  FileCheck2,
  MousePointerClick,
  Play,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface ExamInstructionsViewProps {
  test: any;
  busy: boolean;
  onBack: () => void;
  onConfirmStart: () => void;
}

export function ExamInstructionsView({
  test,
  busy,
  onBack,
  onConfirmStart,
}: ExamInstructionsViewProps) {
  const [agreed, setAgreed] = useState(false);

  const durationMinutes = Math.max(1, Math.round((test.duration_seconds ?? 3600) / 60));
  const questionCount = Number(test.question_count ?? 0);

  return (
    <div className="exam-instructions-wrap">
      <section className="panel admin-panel exam-instructions-card">
        <div className="exam-instructions-header">
          <div>
            <span className="exam-pill">
              {test.exam_name} · {test.stage_name}
            </span>
            <h1>{test.name} — Pre-Exam Instructions</h1>
            <p>
              Read how to attend the examination and the mandatory lockdown
              proctoring rules carefully before entering the test screen.
            </p>
          </div>
          <div className="exam-summary-chips">
            <span>
              <FileCheck2 size={15} />{" "}
              {questionCount > 0 ? `${questionCount} questions` : "Dynamic bank set"}
            </span>
            <span>
              <Clock3 size={15} /> {durationMinutes} minutes
            </span>
            <span>
              <ShieldCheck size={15} />{" "}
              {test.review_policy === "after_submit"
                ? "Review allowed after submit"
                : "Strict score-only result"}
            </span>
          </div>
        </div>

        <div className="instructions-grid">
          <div className="instruction-block">
            <h2>1. How to Attend the Examination</h2>
            <ul>
              <li>
                Questions are drawn automatically without repeats, and option
                order (<strong>A, B, C, D</strong>) is dynamically shuffled on
                every attempt.
              </li>
              <li>
                Click an option button using your <strong>mouse pointer</strong>{" "}
                to choose an answer, then click <strong>Save &amp; next</strong>{" "}
                to move forward.
              </li>
              <li>
                Use <strong>Clear response</strong> to deselect an option, and{" "}
                <strong>Mark for review</strong> to flag a question in the right
                palette.
              </li>
              <li>
                <strong>Question Palette Guide:</strong>{" "}
                <span className="legend-tag answered">Answered</span>{" "}
                <span className="legend-tag marked">Marked for review</span>{" "}
                <span className="legend-tag unvisited">Not visited</span>.
              </li>
              <li>
                Responses autosave to the server continuously. The exam
                automatically submits when the server timer reaches{" "}
                <strong>00:00:00</strong>.
              </li>
            </ul>
          </div>

          <div className="instruction-block proctor-rules">
            <h2>2. Mandatory Exam Lockdown &amp; Proctoring Rules</h2>
            <div className="proctor-rule-item">
              <MousePointerClick size={18} />
              <div>
                <strong>Mouse-Only Access (Keyboard Disabled)</strong>
                <p>
                  All keyboard input (typing, Tab, Enter, Space, copy/paste,
                  right-click, DevTools shortcuts) is blocked inside the exam
                  screen. Only mouse clicks are permitted.
                </p>
              </div>
            </div>
            <div className="proctor-rule-item">
              <ShieldAlert size={18} />
              <div>
                <strong>Fullscreen &amp; Companion Tab Lockdown</strong>
                <p>
                  Entering the exam switches into fullscreen lock and
                  automatically closes or locks any other open HHK tabs.
                  Switching tabs or minimizing the exam window logs a warning;{" "}
                  <strong>3 violations automatically submit your test</strong>.
                </p>
              </div>
            </div>
            <div className="proctor-rule-item">
              <Camera size={18} />
              <div>
                <strong>Proctor Camera Monitor (Dummy — Not Recorded)</strong>
                <p>
                  A live camera monitoring indicator stays active inside the exam
                  sidebar throughout your session.{" "}
                  <strong>
                    No video or audio is recorded, stored, or transmitted.
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <label className="instructions-consent">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I have read all instructions and agree to attend using mouse-only
            controls, fullscreen single-tab lockdown, and the non-recording
            proctor camera monitor.
          </span>
        </label>

        <div className="instructions-actions">
          <button
            type="button"
            className="outline-btn"
            disabled={busy}
            onClick={onBack}
          >
            <ArrowLeft size={15} /> Back to mock tests
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={!agreed || busy}
            onClick={onConfirmStart}
          >
            <Play size={14} fill="currentColor" />{" "}
            {busy ? "Entering locked exam…" : "Agree & Enter Exam"}
          </button>
        </div>

        <div className="instructions-footnote">
          <AlertTriangle size={14} />
          <span>
            Close unrelated browser windows before clicking start to avoid
            accidental focus-loss warnings.
          </span>
        </div>
      </section>
    </div>
  );
}
