import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SessionSummary } from "../types/interview";
import { loadHistory } from "../utils/interviewSession";

const TAG_ORDER = ["PROJECT", "SKILL", "EXPERIENCE", "ROLE"] as const;

const getTagColor = (tag: string) => {
  switch (tag) {
    case "PROJECT":
      return "bg-purple-500";
    case "SKILL":
      return "bg-green-500";
    case "EXPERIENCE":
      return "bg-yellow-500";
    case "ROLE":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

const scoreLabel = (score: number) => {
  if (score >= 8) return "Strong performance";
  if (score >= 6) return "Solid foundation";
  if (score >= 4) return "Room to grow";
  return "Keep practicing";
};

const Feedback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromNav = (location.state as { summary?: SessionSummary } | null)?.summary;

  const history = useMemo(() => loadHistory(), []);
  const [selectedId, setSelectedId] = useState<string | null>(
    fromNav?.sessionId ?? history[0]?.sessionId ?? null,
  );

  const summary =
    history.find((s) => s.sessionId === selectedId) ?? fromNav ?? history[0] ?? null;

  if (!summary) {
    return (
      <FeedbackShell>
        <FeedbackEmpty onStart={() => navigate("/interview")} onHome={() => navigate("/")} />
      </FeedbackShell>
    );
  }

  const completedDate = new Date(summary.completedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const scorePercent = Math.min(100, (summary.overallScore / 10) * 100);

  return (
    <FeedbackShell>
      <header className="mb-8">
        <span className="home-hero-badge">Session report</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
          Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-500">
            interview feedback
          </span>
        </h1>
        <p className="opacity-60 mt-2 text-sm">
          {summary.role} · {completedDate}
        </p>
      </header>

      {history.length > 1 && (
        <div className="mb-8">
          <label className="text-xs uppercase tracking-wider opacity-50 block mb-2">
            Past sessions
          </label>
          <select
            value={summary.sessionId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="feedback-session-select"
          >
            {history.map((s, i) => (
              <option key={s.sessionId} value={s.sessionId}>
                {i === 0 ? "Latest — " : ""}
                {s.role} ({s.overallScore}/10) —{" "}
                {new Date(s.completedAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <div className="md:col-span-2 feedback-score-hero">
          <p className="text-xs uppercase tracking-wider opacity-50 mb-4">Overall score</p>
          <div className="feedback-score-ring-wrap">
            <svg className="feedback-score-ring" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--border)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(scorePercent / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="feedback-score-center">
              <span className="text-4xl font-bold text-[var(--primary)]">
                {summary.overallScore}
              </span>
              <span className="text-sm opacity-50">/10</span>
            </div>
          </div>
          <p className="text-center font-medium mt-4">{scoreLabel(summary.overallScore)}</p>
          <p className="text-center text-sm opacity-50 mt-1">
            {summary.answers.length} questions answered
          </p>
        </div>

        <div className="md:col-span-3 feedback-panel">
          <p className="text-xs uppercase tracking-wider opacity-50 mb-4">Performance by category</p>
          {TAG_ORDER.filter((tag) => summary.tagScores[tag] !== undefined).length > 0 ? (
            <div className="space-y-4">
              {TAG_ORDER.filter((tag) => summary.tagScores[tag] !== undefined).map((tag) => (
                <TagScoreBar
                  key={tag}
                  tag={tag}
                  score={summary.tagScores[tag]}
                  colorClass={getTagColor(tag)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-50">No category breakdown for this session.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button type="button" onClick={() => navigate("/interview")} className="interview-cta-primary">
          Practice again
        </button>
        <button type="button" onClick={() => navigate("/")} className="interview-btn-ghost">
          Back to home
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-4">Question breakdown</h2>
      <div className="space-y-3">
        {summary.answers.map((a, i) => (
          <details key={i} className="feedback-question-card group">
            <summary className="feedback-question-summary">
              <span className="feedback-q-num">Q{i + 1}</span>
              <span className="font-medium flex-1 min-w-0 truncate pr-3">
                {a.question}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded text-white shrink-0 ${getTagColor(a.tag)}`}>
                {a.tag}
              </span>
              <span className="feedback-q-score shrink-0">{a.score}/10</span>
              <span className="feedback-chevron shrink-0 opacity-40 group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="feedback-question-body">
              <Block title="Your answer" body={a.userAnswer} />
              <Block title="Strengths" items={a.strengths} tone="positive" />
              <Block title="Improvements" items={a.improvements} tone="warn" />
              {a.modelAnswerSnippet && (
                <div className="feedback-hint">
                  <p className="text-xs uppercase tracking-wider opacity-50 mb-1">Coach hint</p>
                  <p className="text-sm opacity-80">{a.modelAnswerSnippet}</p>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-8 text-xs opacity-40 text-center">
        Phase 1 uses mock scoring · Phase 2 will use Gemini for real evaluation
      </p>
    </FeedbackShell>
  );
};

const FeedbackShell = ({ children }: { children: ReactNode }) => (
  <div className="interview-room flex-1 overflow-y-auto">
    <div className="interview-room-grid" aria-hidden />
    <div className="interview-room-spotlight" aria-hidden />
    <div className="relative z-10 min-h-full p-6 md:p-10 max-w-5xl mx-auto">{children}</div>
  </div>
);

const FeedbackEmpty = ({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) => (
  <div className="feedback-empty">
    <div className="interview-stage max-w-lg mx-auto text-center py-12 px-6">
      <div className="interview-avatar-ring w-20 h-20 mx-auto mb-6">
        <div className="interview-avatar">
          <svg
            className="w-8 h-8 text-white/80"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">No feedback yet</h1>
      <p className="opacity-60 mb-8 text-sm">
        Complete a mock interview to unlock your scorecard — overall score, category breakdown,
        and per-question coach notes.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={onStart} className="interview-cta-primary">
          Go to interview room
        </button>
        <button type="button" onClick={onHome} className="interview-btn-ghost">
          Set up on home
        </button>
      </div>
    </div>
  </div>
);

const TagScoreBar = ({
  tag,
  score,
  colorClass,
}: {
  tag: string;
  score: number;
  colorClass: string;
}) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className={`text-xs px-2 py-0.5 rounded text-white ${colorClass}`}>{tag}</span>
      <span className="font-semibold">{score}/10</span>
    </div>
    <div className="feedback-bar-track">
      <div className="feedback-bar-fill" style={{ width: `${(score / 10) * 100}%` }} />
    </div>
  </div>
);

const Block = ({
  title,
  body,
  items,
  tone,
}: {
  title: string;
  body?: string;
  items?: string[];
  tone?: "positive" | "warn";
}) => (
  <div>
    <p
      className={`text-sm font-medium mb-1 ${
        tone === "positive"
          ? "text-green-600 dark:text-green-400"
          : tone === "warn"
            ? "text-amber-600 dark:text-amber-400"
            : "opacity-70"
      }`}
    >
      {title}
    </p>
    {body && <p className="text-sm opacity-90">{body}</p>}
    {items && (
      <ul className="list-disc list-inside text-sm opacity-90 space-y-0.5">
        {items.map((s, j) => (
          <li key={j}>{s}</li>
        ))}
      </ul>
    )}
  </div>
);

export default Feedback;
