import type {
  AnswerRecord,
  EvaluateAnswerResult,
  InterviewSession,
  Question,
  SessionSummary,
} from "../types/interview";

const SESSION_KEY = "interviewSession";
const HISTORY_KEY = "interviewHistory";
const MAX_HISTORY = 10;

const TAGS = ["PROJECT", "SKILL", "EXPERIENCE", "ROLE"] as const;

export function loadSession(): InterviewSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InterviewSession;
  } catch {
    return null;
  }
}

export function saveSession(session: InterviewSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** End an in-progress interview without saving to history */
export function stopActiveInterview(): void {
  clearSession();
}

export function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionSummary[];
  } catch {
    return [];
  }
}

export function saveToHistory(summary: SessionSummary): void {
  const history = loadHistory();
  const next = [summary, ...history.filter((s) => s.sessionId !== summary.sessionId)].slice(
    0,
    MAX_HISTORY,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function buildSummary(session: InterviewSession): SessionSummary {
  const scores = session.answers.map((a) => a.score);
  const overallScore =
    scores.length === 0
      ? 0
      : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  const tagScores: Record<string, number> = {};
  for (const tag of TAGS) {
    const tagged = session.answers.filter((a) => a.tag === tag);
    if (tagged.length > 0) {
      tagScores[tag] =
        Math.round((tagged.reduce((s, a) => s + a.score, 0) / tagged.length) * 10) / 10;
    }
  }

  return {
    sessionId: session.id,
    role: session.role,
    completedAt: new Date().toISOString(),
    overallScore,
    tagScores,
    answers: session.answers,
  };
}

export function createSession(role: string, questions: Question[]): InterviewSession {
  return {
    id: crypto.randomUUID(),
    role,
    startedAt: new Date().toISOString(),
    questions,
    currentIndex: 0,
    answers: [],
    status: "in_progress",
  };
}

/** Phase 1 placeholder — replaced by POST /evaluate-answer in phase 2 */
export async function mockEvaluateAnswer(
  question: string,
  tag: string,
  userAnswer: string,
): Promise<EvaluateAnswerResult> {
  await new Promise((r) => setTimeout(r, 600));

  const trimmed = userAnswer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  let score = 4;
  if (wordCount >= 20) score = 7;
  else if (wordCount >= 10) score = 6;
  else if (wordCount >= 5) score = 5;

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (wordCount >= 10) {
    strengths.push("Answer has reasonable depth for a mock evaluation.");
  } else {
    improvements.push("Expand with more detail — aim for at least a few sentences.");
  }

  if (trimmed.toLowerCase().includes("because") || trimmed.toLowerCase().includes("so that")) {
    strengths.push("Shows reasoning in your explanation.");
  } else {
    improvements.push("Explain the why behind your decisions, not just what you did.");
  }

  if (tag === "PROJECT" && !/project|built|implemented|developed/i.test(trimmed)) {
    improvements.push("Tie your answer more clearly to a specific project from your resume.");
  }

  if (strengths.length === 0) {
    strengths.push("You attempted the question — good start for practice.");
  }
  if (improvements.length === 0) {
    improvements.push("Add metrics or outcomes if you have them (latency, users, % improvement).");
  }

  return {
    score,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    model_answer_snippet: `For "${question.slice(0, 60)}${question.length > 60 ? "…" : ""}", a strong ${tag} answer uses a clear structure: context → your action → result → tradeoffs.`,
  };
}

export function toAnswerRecord(
  questionIndex: number,
  question: Question,
  userAnswer: string,
  evalResult: EvaluateAnswerResult,
): AnswerRecord {
  return {
    questionIndex,
    question: question.question,
    tag: question.tag,
    userAnswer,
    score: evalResult.score,
    strengths: evalResult.strengths,
    improvements: evalResult.improvements,
    modelAnswerSnippet: evalResult.model_answer_snippet,
  };
}
