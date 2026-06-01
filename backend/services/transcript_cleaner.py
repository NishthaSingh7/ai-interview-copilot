from config.settings import DEMO_MODE, GEMINI_SPEECH_CLEAN
from services.gemini_client import generate_content_async
from services.speech_fixes import apply_local_speech_fixes


async def clean_transcript(
    raw_transcript: str,
    question: str | None = None,
    skills_hint: str | None = None,
) -> str:
    raw = (raw_transcript or "").strip()
    if not raw:
        return ""

    locally_fixed = apply_local_speech_fixes(raw)
    if len(locally_fixed) < 12:
        return locally_fixed

    if DEMO_MODE or not GEMINI_SPEECH_CLEAN:
        return locally_fixed

    try:
        context = ""
        if question:
            context += f"Interview question context: {question}\n"
        if skills_hint:
            context += f"Technologies the candidate may mention: {skills_hint}\n"

        prompt = f"""
You clean speech-to-text transcripts from mock technical interviews.

{context}
RAW TRANSCRIPT (from browser speech recognition, may contain errors):
{locally_fixed}

Rules:
- Fix misheard tech terms (examples: "Web RTC" -> "WebRTC", "java script" -> "JavaScript", "node js" -> "Node.js", "mongo d b" -> "MongoDB", "fast API" -> "FastAPI", "type script" -> "TypeScript", "j w t" -> "JWT", "rag" -> "RAG" when appropriate).
- Fix spacing, capitalization, and punctuation.
- Remove filler words (um, uh, like, you know) unless they change meaning.
- Do NOT invent facts, projects, or metrics not spoken by the candidate.
- Do NOT add content the user did not say.
- Keep the same meaning and tone — interview answer style.
- Return ONLY the cleaned transcript as plain text. No quotes, labels, or markdown.
"""

        response = await generate_content_async(prompt)

        if response and response.text:
            cleaned = response.text.strip().strip('"').strip("'")
            if cleaned:
                return apply_local_speech_fixes(cleaned)

        return locally_fixed

    except Exception as e:
        print("❌ Transcript clean error:", e)
        return locally_fixed
