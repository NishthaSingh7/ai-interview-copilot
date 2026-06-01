export type InterviewMode = "quick" | "full";

export const INTERVIEW_MODE_KEY = "interviewMode";
export const JOB_DESCRIPTION_KEY = "jobDescription";

export const QUESTION_LIMITS: Record<InterviewMode, number> = {
  quick: 5,
  full: 12,
};

export const TIMER_SECONDS: Record<InterviewMode, number> = {
  quick: 120,
  full: 180,
};

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
