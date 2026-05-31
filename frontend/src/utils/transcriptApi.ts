import { api } from "../services/api";
import { applyLocalSpeechFixes } from "./speechClean";

export async function cleanTranscriptWithAI(params: {
  rawTranscript: string;
  question?: string;
  sections?: Record<string, string[]>;
}): Promise<{ cleaned: string; raw: string }> {
  const raw = params.rawTranscript.trim();
  if (!raw) {
    return { cleaned: "", raw: "" };
  }

  try {
    const res = await api.post("/clean-transcript", {
      raw_transcript: raw,
      question: params.question ?? null,
      sections: params.sections ?? null,
    });

    return {
      cleaned: res.data.cleaned_transcript || applyLocalSpeechFixes(raw),
      raw: res.data.raw_transcript || raw,
    };
  } catch (err) {
    console.error("Transcript clean failed, using local fixes:", err);
    return {
      cleaned: applyLocalSpeechFixes(raw),
      raw,
    };
  }
}
