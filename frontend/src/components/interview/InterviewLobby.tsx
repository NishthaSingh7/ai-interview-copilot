import type { InterviewMode } from "../../types/interview";
import { QUESTION_LIMITS } from "../../constants/interview";
import type { UsageToday } from "../../types/auth";
import DailyLimitBanner from "./DailyLimitBanner";

type Props = {
  role: string | null;
  hasResume: boolean;
  hasJobDescription: boolean;
  mode: InterviewMode;
  loading: boolean;
  stoppedMessage: string | null;
  usageToday: UsageToday | null;
  onStart: () => void;
};

const InterviewLobby = ({
  role,
  hasResume,
  hasJobDescription,
  mode,
  loading,
  stoppedMessage,
  usageToday,
  onStart,
}: Props) => {
  const ready = Boolean(role && hasResume);
  const questionCount = QUESTION_LIMITS[mode];
  const limitReached = usageToday !== null && !usageToday.can_start_interview;

  if (limitReached && usageToday) {
    return (
      <div className="interview-lobby">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="interview-badge-waiting">Waiting room</span>
        </div>
        <DailyLimitBanner usage={usageToday} />
      </div>
    );
  }

  return (
    <div className="interview-lobby">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="interview-badge-waiting">Waiting room</span>
        <span className="text-xs opacity-50">Session not started</span>
      </div>

      <div className="interview-stage mb-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
          <div className="interview-interviewer shrink-0">
            <div className="interview-avatar-ring">
              <div className="interview-avatar">
                <svg
                  className="w-10 h-10 text-white/90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-center text-sm font-medium mt-4">AI Interviewer</p>
            <p className="text-center text-xs opacity-50">Ready when you are</p>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              You&apos;re in the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-500">
                interview room
              </span>
            </h1>
            <p className="opacity-70 max-w-lg mx-auto lg:mx-0 mb-6">
              {mode === "quick"
                ? `Quick ${questionCount}-question session with timed answers and Gemini feedback after each response.`
                : `Full ~${questionCount}-question session with timed answers and Gemini feedback after each response.`}
            </p>

            <div className="interview-readiness inline-flex flex-col gap-2 text-sm text-left w-full max-w-sm mx-auto lg:mx-0">
              <ReadinessRow ok={hasResume} label="Resume uploaded" />
              <ReadinessRow
                ok={Boolean(role)}
                label={role ? `Role: ${role}` : "Role selected on Home"}
              />
              <ReadinessRow
                ok={hasJobDescription}
                label={
                  hasJobDescription
                    ? "Job description linked"
                    : "No job description (optional)"
                }
              />
              <ReadinessRow
                ok
                label={`${mode === "quick" ? "Quick" : "Full"} mode · ${questionCount} questions`}
              />
            </div>
          </div>
        </div>
      </div>

      {stoppedMessage && <div className="interview-alert mb-6">{stoppedMessage}</div>}

      {!ready && (
        <div className="interview-alert mb-6">
          Complete setup on Home — upload your resume and pick a role before starting.
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !ready || limitReached}
          className="interview-cta-primary w-full sm:w-auto"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="interview-cta-spinner" />
              Preparing session...
            </span>
          ) : (
            "Begin interview session"
          )}
        </button>
        <p className="text-xs opacity-50 text-center sm:text-left">
          {questionCount} questions · Gemini evaluation
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <TipCard title="One at a time" desc="Focus on a single question — no overwhelm." />
        <TipCard title="Speak or type" desc="Use the mic — your words appear cleaned in the answer box." />
        <TipCard title="Stop anytime" desc="Not ready? End the session and return later." />
      </div>
    </div>
  );
};

const ReadinessRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
        ok ? "bg-green-500/20 text-green-500" : "bg-[var(--border)] opacity-40"
      }`}
    >
      {ok ? "✓" : "·"}
    </span>
    <span className={ok ? "opacity-90" : "opacity-50"}>{label}</span>
  </div>
);

const TipCard = ({ title, desc }: { title: string; desc: string }) => (
  <div className="interview-tip-card">
    <p className="font-medium text-sm mb-1">{title}</p>
    <p className="text-xs opacity-60">{desc}</p>
  </div>
);

export default InterviewLobby;
