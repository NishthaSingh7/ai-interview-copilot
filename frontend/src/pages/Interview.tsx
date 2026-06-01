import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InterviewLobby from "../components/interview/InterviewLobby";
import InterviewLoading from "../components/interview/InterviewLoading";
import InterviewRoomShell from "../components/interview/InterviewRoomShell";
import {
  INTERVIEW_MODE_KEY,
  JOB_DESCRIPTION_KEY,
  TIMER_SECONDS,
  formatTimer,
  type InterviewMode,
} from "../constants/interview";
import { useQuestionTimer } from "../hooks/useQuestionTimer";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { cleanTranscriptWithAI } from "../utils/transcriptApi";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import type { AnswerRecord, InterviewSession, Question } from "../types/interview";
import {
  buildSummary,
  createSession,
  enrichSummaryWithCoaching,
  evaluateAnswer,
  loadSession,
  saveSession,
  saveToHistory,
  stopActiveInterview,
  toAnswerRecord,
} from "../utils/interviewSession";

const getTagColor = (tag: string) => {
  switch (tag) {
    case "SUMMARY":
      return "bg-cyan-500";
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

const timerUrgency = (remaining: number) => {
  if (remaining <= 10) return "critical";
  if (remaining <= 30) return "warning";
  return "normal";
};

const Interview = () => {
  const navigate = useNavigate();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastFeedback, setLastFeedback] = useState<AnswerRecord | null>(null);
  const [stoppedMessage, setStoppedMessage] = useState<string | null>(null);

  const [cleaningSpeech, setCleaningSpeech] = useState(false);
  const [verifiedTranscript, setVerifiedTranscript] = useState<string | null>(null);
  const [usingFallbackQuestions, setUsingFallbackQuestions] = useState(false);

  const { usageToday, refreshUsage } = useAuth();
  const { listening, startListening, stopListening, resetLive } = useSpeechToText();

  const role = localStorage.getItem("role");
  const hasResume = Boolean(localStorage.getItem("sections"));
  const hasJobDescription = Boolean(localStorage.getItem(JOB_DESCRIPTION_KEY)?.trim());
  const lobbyMode =
    (localStorage.getItem(INTERVIEW_MODE_KEY) as InterviewMode) || "full";

  useEffect(() => {
    const saved = loadSession();
    if (saved?.status === "in_progress" && saved.questions.length > 0) {
      setSession(saved);
    }
  }, []);

  const started = session !== null;

  useEffect(() => {
    if (!started) {
      void refreshUsage();
    }
  }, [started, refreshUsage]);

  const currentQuestion: Question | undefined = session?.questions[session.currentIndex];
  const total = session?.questions.length ?? 0;
  const progress = total > 0 ? ((session?.currentIndex ?? 0) + 1) / total : 0;
  const mode: InterviewMode = session?.mode ?? lobbyMode;

  const timerPaused = evaluating || Boolean(lastFeedback) || !started;
  const { remaining, expired } = useQuestionTimer(
    TIMER_SECONDS[mode],
    timerPaused,
    session?.currentIndex ?? 0,
  );

  const persist = (next: InterviewSession) => {
    saveSession(next);
    setSession(next);
  };

  const startInterview = async () => {
    const sections = JSON.parse(localStorage.getItem("sections") || "{}");
    const storedRole = localStorage.getItem("role");
    const interviewMode =
      (localStorage.getItem(INTERVIEW_MODE_KEY) as InterviewMode) || "full";
    const jobDescription = localStorage.getItem(JOB_DESCRIPTION_KEY)?.trim() || null;

    if (!sections || !storedRole) {
      alert("Upload resume and select a role on Home first.");
      return;
    }

    try {
      setLoading(true);
      setLastFeedback(null);
      setAnswer("");

      const res = await api.post("/start-interview", {
        sections,
        role: storedRole,
        mode: interviewMode,
        job_description: jobDescription,
      });
      const questions: Question[] = res.data.questions || [];

      if (questions.length === 0) {
        alert("No questions generated. Try again.");
        return;
      }

      setUsingFallbackQuestions(Boolean(res.data.using_fallback));
      setStoppedMessage(null);
      void refreshUsage();
      const newSession = createSession(
        storedRole,
        questions,
        (res.data.mode as InterviewMode) || interviewMode,
      );
      persist(newSession);
    } catch (err: unknown) {
      console.error(err);
      const ax = err as {
        response?: {
          status?: number;
          data?: { detail?: string | { message?: string; code?: string } };
        };
      };
      const detail = ax.response?.data?.detail;
      if (ax.response?.status === 429) {
        const msg =
          typeof detail === "object" && detail?.message
            ? detail.message
            : typeof detail === "string"
              ? detail
              : "You've already used your free interview for today. Your limit refreshes at midnight UTC — try again tomorrow.";
        setStoppedMessage(msg);
        void refreshUsage();
      } else if (ax.response?.status === 401) {
        alert("Please log in again.");
      } else {
        alert(
          typeof detail === "string"
            ? detail
            : "Failed to generate questions. Is the backend running?",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const stopInterview = () => {
    const answered = session?.answers.length ?? 0;
    const message =
      answered > 0
        ? `Stop this interview? Your ${answered} answered question(s) will not be saved to Feedback. You can start fresh when you're ready.`
        : "Stop this interview? All questions will be cleared. You can come back and start again when you're prepared.";

    if (!window.confirm(message)) {
      return;
    }

    stopActiveInterview();
    setSession(null);
    setAnswer("");
    setLastFeedback(null);
    setStoppedMessage("Interview stopped. Questions cleared — start again when you're ready.");
  };

  const submitAnswer = async () => {
    if (!session || !currentQuestion) return;

    const trimmed = answer.trim();
    if (!trimmed) return;

    const sections = JSON.parse(localStorage.getItem("sections") || "{}");

    try {
      setEvaluating(true);

      const evalResult = await evaluateAnswer({
        role: session.role,
        sections,
        question: currentQuestion.question,
        tag: currentQuestion.tag,
        userAnswer: trimmed,
      });

      const record = toAnswerRecord(session.currentIndex, currentQuestion, trimmed, evalResult);

      const updated: InterviewSession = {
        ...session,
        answers: [...session.answers, record],
      };
      persist(updated);
      setLastFeedback(record);
      setAnswer("");
      stopListening();
      resetLive();
    } catch (err) {
      console.error(err);
      alert("Could not evaluate answer. Is the backend running?");
    } finally {
      setEvaluating(false);
    }
  };

  const finishInterview = async (finalSession: InterviewSession) => {
    const completed: InterviewSession = { ...finalSession, status: "completed" };
    const base = buildSummary(completed);
    const summary = await enrichSummaryWithCoaching(base);
    saveToHistory(summary);
    saveSession(completed);
    navigate("/feedback", { state: { summary } });
  };

  const goToNextQuestion = () => {
    if (!session) return;

    setLastFeedback(null);
    setAnswer("");
    setVerifiedTranscript(null);
    resetLive();
    stopListening();

    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      void finishInterview(session);
      return;
    }

    persist({ ...session, currentIndex: nextIndex });
  };

  const runTranscriptCleaning = async (raw: string) => {
    if (!raw.trim()) return;

    setCleaningSpeech(true);
    setVerifiedTranscript(null);

    try {
      const sections = JSON.parse(localStorage.getItem("sections") || "{}");
      const { cleaned } = await cleanTranscriptWithAI({
        rawTranscript: raw,
        question: currentQuestion?.question,
        sections,
      });
      setVerifiedTranscript(cleaned);
      setAnswer(cleaned);
    } catch (err) {
      console.error(err);
      alert("Could not clean transcript. Check backend is running.");
    } finally {
      setCleaningSpeech(false);
    }
  };

  const handleMicClick = () => {
    if (evaluating || cleaningSpeech) return;

    if (listening) {
      stopListening();
      return;
    }

    setVerifiedTranscript(null);
    startListening({
      onRawFinal: (raw) => {
        void runTranscriptCleaning(raw);
      },
    });
  };

  const isLastQuestion =
    session !== null && session.currentIndex >= session.questions.length - 1;

  const urgency = timerUrgency(remaining);

  return (
    <InterviewRoomShell>
      {loading && role && <InterviewLoading role={role} />}

      {!loading && !started && (
        <InterviewLobby
          role={role}
          hasResume={hasResume}
          hasJobDescription={hasJobDescription}
          mode={lobbyMode}
          loading={loading}
          stoppedMessage={stoppedMessage}
          usageToday={usageToday}
          onStart={startInterview}
        />
      )}

      {!loading && started && currentQuestion && session && (
        <div className="interview-active">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="interview-badge-live">
                <span className="live-dot" />
                Live session
              </span>
              <span className="text-sm opacity-60">
                {session.role} · {session.mode === "quick" ? "Quick" : "Full"} ·{" "}
                {session.answers.length} answered
              </span>
            </div>
            <button
              type="button"
              onClick={stopInterview}
              disabled={evaluating}
              className="interview-btn-stop"
            >
              Stop interview
            </button>
          </header>

          {usingFallbackQuestions && (
            <p className="text-xs rounded-lg px-3 py-2 mb-4 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
              Questions loaded from offline backup (AI quota unavailable). Your session still
              works end-to-end.
            </p>
          )}

          <div className="mb-6">
            <div className="flex justify-between text-xs uppercase tracking-wider opacity-50 mb-2">
              <span>
                Question {session.currentIndex + 1} of {total}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`interview-timer interview-timer-${urgency}`}
                  aria-live="polite"
                >
                  {formatTimer(remaining)}
                </span>
                <span>{Math.round(progress * 100)}% complete</span>
              </div>
            </div>
            <div className="interview-progress-track">
              <div
                className="interview-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {expired && !lastFeedback && (
              <p className="interview-timer-expired mt-2">
                Time&apos;s up — wrap up your answer and submit when ready.
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <div className="interview-panel interviewer-panel h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="interview-avatar-sm">
                    <svg
                      className="w-5 h-5 text-white/90"
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
                  <div>
                    <p className="text-xs opacity-50 uppercase tracking-wider">Interviewer</p>
                    <p className="text-sm font-medium">Asking now</p>
                  </div>
                </div>
                <span
                  className={`inline-block text-xs px-2 py-1 rounded text-white mb-4 ${getTagColor(
                    currentQuestion.tag,
                  )}`}
                >
                  {currentQuestion.tag}
                </span>
                <p className="text-lg font-medium leading-relaxed interview-question-text">
                  {currentQuestion.question}
                </p>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              {!lastFeedback && (
                <div className="interview-panel candidate-panel">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs opacity-50 uppercase tracking-wider">Your response</p>
                    <button
                      type="button"
                      onClick={handleMicClick}
                      disabled={evaluating || cleaningSpeech}
                      className={`speech-mic-btn ${listening ? "speech-mic-btn-active" : ""}`}
                      aria-pressed={listening}
                      aria-label={listening ? "Stop recording" : "Speak your answer"}
                    >
                      {listening ? (
                        <span className="flex items-center gap-2">
                          <span className="speech-wave" aria-hidden>
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                          </span>
                          Stop
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <MicIcon />
                          Speak answer
                        </span>
                      )}
                    </button>
                  </div>

                  {listening && (
                    <div className="speech-status-box speech-status-recording mb-3">
                      <p className="text-sm font-medium">Recording your answer…</p>
                      <p className="text-xs opacity-60 mt-1">
                        Speak clearly. Raw speech is not shown — we clean and verify your
                        transcript when you stop (fixes WebRTC, JWT, etc.).
                      </p>
                    </div>
                  )}

                  {cleaningSpeech && (
                    <div className="speech-status-box speech-status-cleaning mb-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <span className="interview-cta-spinner" />
                        Cleaning & verifying transcript…
                      </p>
                    </div>
                  )}

                  {verifiedTranscript && !listening && !cleaningSpeech && (
                    <div className="speech-verified-preview mb-3" aria-live="polite">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                        Verified transcript
                      </p>
                      <p className="text-sm opacity-90 leading-relaxed">{verifiedTranscript}</p>
                      <p className="text-xs opacity-45 mt-2">
                        Edit below if needed, then submit.
                      </p>
                    </div>
                  )}

                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      if (verifiedTranscript && e.target.value !== verifiedTranscript) {
                        setVerifiedTranscript(null);
                      }
                    }}
                    rows={7}
                    placeholder="Click Speak answer — we clean tech terms for you — or type directly."
                    disabled={evaluating || cleaningSpeech}
                    className="interview-textarea"
                  />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={evaluating || !answer.trim()}
                      className={`interview-cta-primary ${expired ? "interview-cta-pulse" : ""}`}
                    >
                      {evaluating ? "Evaluating with Gemini..." : "Submit answer"}
                    </button>
                    <button
                      type="button"
                      onClick={stopInterview}
                      disabled={evaluating}
                      className="interview-btn-ghost"
                    >
                      Not ready — stop
                    </button>
                  </div>
                </div>
              )}

              {lastFeedback && (
                <div className="interview-panel feedback-panel space-y-4">
                  {lastFeedback.evalDegraded && (
                    <p className="text-xs rounded-lg px-3 py-2 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                      AI grading was limited (API quota or connection). Score is estimated from
                      answer depth — check Gemini billing for full AI feedback.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs opacity-50 uppercase tracking-wider">Coach feedback</p>
                    <div className="interview-score-ring">
                      <span className="text-2xl font-bold text-[var(--primary)]">
                        {lastFeedback.score}
                      </span>
                      <span className="text-xs opacity-50">/10</span>
                    </div>
                  </div>

                  <FeedbackBlock title="Strengths" tone="positive" items={lastFeedback.strengths} />
                  <FeedbackBlock
                    title="Improvements"
                    tone="warn"
                    items={lastFeedback.improvements}
                  />

                  {lastFeedback.modelAnswerSnippet && (
                    <div className="pt-3 border-t border-[var(--border)]">
                      <p className="text-xs opacity-50 uppercase tracking-wider mb-2">Hint</p>
                      <p className="text-sm opacity-80">{lastFeedback.modelAnswerSnippet}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button type="button" onClick={goToNextQuestion} className="interview-cta-primary">
                      {isLastQuestion ? "View session summary" : "Next question"}
                    </button>
                    <button type="button" onClick={stopInterview} className="interview-btn-ghost">
                      Stop interview
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </InterviewRoomShell>
  );
};

const FeedbackBlock = ({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "positive" | "warn";
  items: string[];
}) => (
  <div>
    <p
      className={`text-sm font-medium mb-1 ${
        tone === "positive"
          ? "text-green-600 dark:text-green-400"
          : "text-amber-600 dark:text-amber-400"
      }`}
    >
      {title}
    </p>
    <ul className="list-disc list-inside text-sm opacity-90 space-y-1">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  </div>
);

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

export default Interview;
