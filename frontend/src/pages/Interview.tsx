import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InterviewLobby from "../components/interview/InterviewLobby";
import InterviewLoading from "../components/interview/InterviewLoading";
import InterviewRoomShell from "../components/interview/InterviewRoomShell";
import { api } from "../services/api";
import type { AnswerRecord, InterviewSession, Question } from "../types/interview";
import {
  buildSummary,
  createSession,
  loadSession,
  mockEvaluateAnswer,
  saveSession,
  saveToHistory,
  stopActiveInterview,
  toAnswerRecord,
} from "../utils/interviewSession";

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

const Interview = () => {
  const navigate = useNavigate();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastFeedback, setLastFeedback] = useState<AnswerRecord | null>(null);
  const [stoppedMessage, setStoppedMessage] = useState<string | null>(null);

  const role = localStorage.getItem("role");
  const hasResume = Boolean(localStorage.getItem("sections"));

  useEffect(() => {
    const saved = loadSession();
    if (saved?.status === "in_progress" && saved.questions.length > 0) {
      setSession(saved);
    }
  }, []);

  const started = session !== null;
  const currentQuestion: Question | undefined = session?.questions[session.currentIndex];
  const total = session?.questions.length ?? 0;
  const progress = total > 0 ? ((session?.currentIndex ?? 0) + 1) / total : 0;

  const persist = (next: InterviewSession) => {
    saveSession(next);
    setSession(next);
  };

  const startInterview = async () => {
    const sections = JSON.parse(localStorage.getItem("sections") || "{}");
    const storedRole = localStorage.getItem("role");

    if (!sections || !storedRole) {
      alert("Upload resume and select a role on Home first.");
      return;
    }

    try {
      setLoading(true);
      setLastFeedback(null);
      setAnswer("");

      const res = await api.post("/start-interview", { sections, role: storedRole });
      const questions: Question[] = res.data.questions || [];

      if (questions.length === 0) {
        alert("No questions generated. Try again.");
        return;
      }

      setStoppedMessage(null);
      const newSession = createSession(storedRole, questions);
      persist(newSession);
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions.");
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

    try {
      setEvaluating(true);

      const evalResult = await mockEvaluateAnswer(
        currentQuestion.question,
        currentQuestion.tag,
        trimmed,
      );

      const record = toAnswerRecord(session.currentIndex, currentQuestion, trimmed, evalResult);

      const updated: InterviewSession = {
        ...session,
        answers: [...session.answers, record],
      };
      persist(updated);
      setLastFeedback(record);
      setAnswer("");
    } catch (err) {
      console.error(err);
      alert("Could not evaluate answer. Try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const finishInterview = (finalSession: InterviewSession) => {
    const completed: InterviewSession = { ...finalSession, status: "completed" };
    const summary = buildSummary(completed);
    saveToHistory(summary);
    saveSession(completed);
    navigate("/feedback", { state: { summary } });
  };

  const goToNextQuestion = () => {
    if (!session) return;

    setLastFeedback(null);

    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      finishInterview(session);
      return;
    }

    persist({ ...session, currentIndex: nextIndex });
  };

  const isLastQuestion =
    session !== null && session.currentIndex >= session.questions.length - 1;

  return (
    <InterviewRoomShell>
      {loading && role && <InterviewLoading role={role} />}

      {!loading && !started && (
        <InterviewLobby
          role={role}
          hasResume={hasResume}
          loading={loading}
          stoppedMessage={stoppedMessage}
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
                {session.role} · {session.answers.length} answered
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

          <div className="mb-6">
            <div className="flex justify-between text-xs uppercase tracking-wider opacity-50 mb-2">
              <span>
                Question {session.currentIndex + 1} of {total}
              </span>
              <span>{Math.round(progress * 100)}% complete</span>
            </div>
            <div className="interview-progress-track">
              <div
                className="interview-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
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
                  <p className="text-xs opacity-50 uppercase tracking-wider mb-3">Your response</p>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={7}
                    placeholder="Speak your answer through text — be specific, use examples..."
                    disabled={evaluating}
                    className="interview-textarea"
                  />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={evaluating || !answer.trim()}
                      className="interview-cta-primary"
                    >
                      {evaluating ? "Evaluating..." : "Submit answer"}
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

export default Interview;
