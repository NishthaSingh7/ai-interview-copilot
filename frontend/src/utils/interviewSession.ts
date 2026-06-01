import { api } from "../services/api";
import type {
  AnswerRecord,
  EvaluateAnswerResult,
  InterviewMode,
  InterviewSession,
  Question,
  SessionSummary,
} from "../types/interview";

const SESSION_KEY = "interviewSession";
const HISTORY_KEY = "interviewHistory";
const MAX_HISTORY = 10;

const TAGS = ["SUMMARY", "PROJECT", "SKILL", "EXPERIENCE", "ROLE"] as const;

export function loadSession(): InterviewSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewSession;
    if (!parsed.mode) parsed.mode = "full";
    return parsed;
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

export function stopActiveInterview(): void {
  clearSession();
}

export function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SessionSummary[];
    return list.map((s) => ({ ...s, mode: s.mode ?? "full" }));
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

  const sessionDegraded = session.answers.some((a) => a.evalDegraded);

  return {
    sessionId: session.id,
    role: session.role,
    mode: session.mode ?? "full",
    completedAt: new Date().toISOString(),
    overallScore,
    tagScores,
    answers: session.answers,
    sessionDegraded,
  };
}

/** Final feedback — always works offline via backend heuristics */
export async function enrichSummaryWithCoaching(
  summary: SessionSummary,
): Promise<SessionSummary> {
  try {
    const res = await api.post("/session-coaching", {
      role: summary.role,
      overall_score: summary.overallScore,
      answers: summary.answers.map((a) => ({
        tag: a.tag,
        score: a.score,
        strengths: a.strengths,
        improvements: a.improvements,
        question: a.question,
        degraded: Boolean(a.evalDegraded),
      })),
    });
    return {
      ...summary,
      coachingHeadline: res.data.headline,
      coachingText: res.data.coaching,
      coachingFocusAreas: res.data.focus_areas,
      sessionDegraded: summary.sessionDegraded || res.data.degraded,
    };
  } catch {
    return {
      ...summary,
      coachingHeadline: "Session complete",
      coachingText: buildLocalCoaching(summary),
      sessionDegraded: summary.sessionDegraded,
    };
  }
}

function buildLocalCoaching(summary: SessionSummary): string {
  if (summary.answers.length === 0) {
    return "Complete at least one question to see personalized coaching.";
  }
  const weakest = Object.entries(summary.tagScores).sort((a, b) => a[1] - b[1])[0];
  const imp = summary.answers.flatMap((a) => a.improvements)[0];
  let text = `Overall ${summary.overallScore}/10 for ${summary.role}.`;
  if (weakest) text += ` Focus next on ${weakest[0]} (${weakest[1]}/10).`;
  if (imp) text += ` ${imp}`;
  return text;
}

export function createSession(
  role: string,
  questions: Question[],
  mode: InterviewMode = "full",
): InterviewSession {
  return {
    id: crypto.randomUUID(),
    role,
    mode,
    startedAt: new Date().toISOString(),
    questions,
    currentIndex: 0,
    answers: [],
    status: "in_progress",
  };
}

export async function mockEvaluateAnswer(
  _question: string,
  tag: string,
  userAnswer: string,
): Promise<EvaluateAnswerResult> {
  await new Promise((r) => setTimeout(r, 600));

  const trimmed = userAnswer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();

  let score = 3;
  if (wordCount >= 80) score = 8;
  else if (wordCount >= 50) score = 7;
  else if (wordCount >= 30) score = 6;
  else if (wordCount >= 18) score = 5;
  else if (wordCount >= 10) score = 4;

  if (/\d+(%|x|ms|users)/i.test(trimmed)) score = Math.min(10, score + 1);
  if (
    ["implemented", "designed", "trade-off", "because", "challenge"].some((k) =>
      lower.includes(k),
    )
  ) {
    score = Math.min(10, score + 1);
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (wordCount >= 40) {
    strengths.push("Good depth for a spoken answer.");
  } else {
    improvements.push("Expand with resume-specific detail and metrics.");
  }

  if (strengths.length === 0) {
    strengths.push("You attempted the question — good start for practice.");
  }
  if (improvements.length === 0) {
    improvements.push("Add trade-offs and measurable outcomes.");
  }

  return {
    score,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    model_answer_snippet: `A strong ${tag} answer uses context → technical choice → trade-off → result.`,
    degraded: true,
  };
}

export async function evaluateAnswer(params: {
  role: string;
  sections: Record<string, string[]>;
  question: string;
  tag: string;
  userAnswer: string;
}): Promise<EvaluateAnswerResult> {
  if (import.meta.env.VITE_USE_MOCK_EVAL === "true") {
    return mockEvaluateAnswer(params.question, params.tag, params.userAnswer);
  }

  const res = await api.post("/evaluate-answer", {
    role: params.role,
    sections: params.sections,
    question: params.question,
    tag: params.tag,
    user_answer: params.userAnswer,
  });

  return {
    score: res.data.score,
    strengths: res.data.strengths ?? [],
    improvements: res.data.improvements ?? [],
    model_answer_snippet: res.data.model_answer_snippet ?? "",
    degraded: Boolean(res.data.degraded),
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
    evalDegraded: evalResult.degraded,
  };
}
