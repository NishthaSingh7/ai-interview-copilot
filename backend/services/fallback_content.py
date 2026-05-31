"""Local fallbacks when Gemini is unavailable — every pipeline step must still work."""

from services.question_format import FALLBACK_QUESTIONS, format_questions
from services.question_generator import _demo_questions_output


def get_fallback_questions(
    sections: dict,
    role: str,
    mode: str,
    limit: int,
) -> list[dict]:
    """Resume-aware demo questions first, then static list."""
    raw = _demo_questions_output(sections, role, mode)
    formatted = format_questions(raw, limit)
    if formatted:
        return formatted

    out = list(FALLBACK_QUESTIONS)
    while len(out) < limit:
        out.extend(FALLBACK_QUESTIONS)
    return out[:limit]
