export type Question = {
  question: string;
  tag: string;
};

export type AnswerRecord = {
  questionIndex: number;
  question: string;
  tag: string;
  userAnswer: string;
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswerSnippet?: string;
};

export type InterviewSession = {
  id: string;
  role: string;
  startedAt: string;
  questions: Question[];
  currentIndex: number;
  answers: AnswerRecord[];
  status: "in_progress" | "completed";
};

export type SessionSummary = {
  sessionId: string;
  role: string;
  completedAt: string;
  overallScore: number;
  tagScores: Record<string, number>;
  answers: AnswerRecord[];
};

export type EvaluateAnswerResult = {
  score: number;
  strengths: string[];
  improvements: string[];
  model_answer_snippet: string;
};
