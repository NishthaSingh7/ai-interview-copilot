import json
import re

from config.settings import DEMO_MODE
from services.gemini_client import generate_content_async
from services.gemini_budget import can_use_gemini


def _resume_context_for_tag(sections: dict, tag: str) -> str:
    if tag == "SUMMARY":
        items = sections.get("summary", [])[:5]
        label = "Professional summary"
    elif tag == "PROJECT":
        items = sections.get("project_items") or sections.get("projects", [])[:4]
        if items and isinstance(items[0], dict):
            items = [f"{p.get('name', '')}: {str(p.get('details', ''))[:200]}" for p in items[:3]]
        label = "Projects from resume"
    elif tag == "SKILL":
        items = sections.get("skills", [])[:8]
        label = "Skills from resume"
    elif tag == "EXPERIENCE":
        items = sections.get("experience", [])[:8]
        label = "Experience from resume"
    else:
        summary = "\n".join(sections.get("summary", [])[:3])
        skills = ", ".join(str(s) for s in sections.get("skills", [])[:8])
        return f"Target role context.\nSummary: {summary or '(none)'}\nSkills: {skills or '(none)'}"

    if not items:
        return f"{label}: (not listed)"
    return f"{label}:\n" + "\n".join(f"- {x}" for x in items)


def _parse_json_response(text: str) -> dict | None:
    if not text:
        return None

    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(cleaned[start : end + 1])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass

    return None


def _heuristic_evaluate(user_answer: str, question: str, tag: str) -> dict:
    """Structured fallback when Gemini is unavailable — scores vary with answer quality."""
    text = user_answer.strip()
    words = [w for w in text.split() if w]
    n = len(words)

    score = 3
    if n >= 120:
        score = 9
    elif n >= 80:
        score = 8
    elif n >= 50:
        score = 7
    elif n >= 30:
        score = 6
    elif n >= 18:
        score = 5
    elif n >= 10:
        score = 4

    lower = text.lower()
    has_metrics = bool(
        re.search(
            r"\b\d+\s*(%|percent|ms|sec|seconds|users|x\b|k\b|million|billion|times)\b",
            text,
            re.I,
        )
    )
    has_tradeoff = any(
        k in lower
        for k in (
            "trade-off",
            "tradeoff",
            "because",
            "challenge",
            "bottleneck",
            "latency",
            "scale",
            "security",
        )
    )
    has_action = any(
        k in lower
        for k in (
            "implemented",
            "designed",
            "architected",
            "built",
            "integrated",
            "optimized",
            "deployed",
        )
    )

    if has_metrics:
        score = min(10, score + 1)
    if has_tradeoff and has_action:
        score = min(10, score + 1)
    if n < 12:
        score = min(score, 4)

    strengths: list[str] = []
    improvements: list[str] = []

    if n >= 40:
        strengths.append("Strong length — you covered substantial ground.")
    elif n >= 20:
        strengths.append("Reasonable depth for a spoken answer.")
    else:
        improvements.append("Go deeper: aim for 45+ seconds with specifics from your resume.")

    if has_metrics:
        strengths.append("You cited numbers or measurable outcomes — interviewers value that.")
    else:
        improvements.append("Add at least one metric (latency, %, users, time saved).")

    if has_action:
        strengths.append("Clear ownership language (designed, built, integrated).")
    if not has_tradeoff:
        improvements.append(
            f"Mention a trade-off, constraint, or failure mode relevant to this {tag} question.",
        )

    if not strengths:
        strengths.append("You attempted the question — keep practicing structure (STAR).")

    snippet = (
        f"For this {tag} question, lead with context, your technical decisions, trade-offs, "
        "and a measurable result tied to the resume."
    )

    return {
        "score": max(1, min(10, score)),
        "strengths": strengths[:3],
        "improvements": improvements[:3],
        "model_answer_snippet": snippet,
        "degraded": not DEMO_MODE,
    }


def _normalize_result(data: dict, *, degraded: bool = False) -> dict:
    score = data.get("score")
    try:
        score = int(score)
    except (TypeError, ValueError):
        score = None

    if score is None:
        score = 5
    score = max(1, min(10, score))

    def as_list(key: str) -> list[str]:
        val = data.get(key, [])
        if isinstance(val, str):
            return [val] if val else []
        if isinstance(val, list):
            return [str(x) for x in val[:3] if x]
        return []

    snippet = data.get("model_answer_snippet", "")
    if not isinstance(snippet, str):
        snippet = str(snippet) if snippet else ""

    strengths = as_list("strengths")
    improvements = as_list("improvements")

    if not strengths:
        strengths = ["Answer addresses the question at a basic level."]
    if not improvements:
        improvements = ["Add more resume-specific detail and measurable outcomes."]
    if not snippet.strip():
        snippet = "Use context → technical choice → trade-off → measurable outcome."

    out = {
        "score": score,
        "strengths": strengths,
        "improvements": improvements,
        "model_answer_snippet": snippet.strip(),
    }
    if degraded:
        out["degraded"] = True
    return out


async def evaluate_answer(
    sections: dict,
    role: str,
    question: str,
    tag: str,
    user_answer: str,
    force_fallback: bool = False,
) -> dict:
    if not user_answer.strip():
        out = _heuristic_evaluate("", question, tag)
        if DEMO_MODE:
            out["degraded"] = False
        return out

    if DEMO_MODE or force_fallback:
        out = _heuristic_evaluate(user_answer, question, tag)
        out["degraded"] = force_fallback or not DEMO_MODE
        return out

    if not await can_use_gemini():
        return _heuristic_evaluate(user_answer, question, tag)

    try:
        context = _resume_context_for_tag(sections, tag)

        prompt = f"""You are a senior technical interviewer scoring a mock interview answer for: {role}.

Resume context ({tag}):
{context}

Question: {question}

Candidate answer:
{user_answer}

Score 1–10 using the FULL range. Do NOT default to 5.
- 9–10: Exceptional — specific, resume-aligned, trade-offs, metrics, clear ownership
- 7–8: Strong — solid depth, mostly complete, minor gaps
- 5–6: Adequate — on topic but shallow, missing trade-offs or proof
- 3–4: Weak — vague, generic, or mostly off-topic
- 1–2: Very poor — almost no substance

A long, detailed, resume-specific answer like the one above should score 7–9 unless it is factually wrong or off-topic.
Penalize generic buzzwords without examples. Reward STAR-style structure and measurable outcomes.

Return ONLY valid JSON:
{{
  "score": <integer 1-10>,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "model_answer_snippet": "2-4 sentences of guidance"
}}
"""

        response = await generate_content_async(prompt)

        if not response or not response.text:
            print("⚠️ Empty Gemini eval output — using heuristic")
            return _heuristic_evaluate(user_answer, question, tag)

        parsed = _parse_json_response(response.text)
        if not parsed:
            print("⚠️ Could not parse eval JSON — using heuristic:", response.text[:200])
            return _heuristic_evaluate(user_answer, question, tag)

        return _normalize_result(parsed, degraded=False)

    except Exception as e:
        err = str(e)
        if "429" in err or "quota" in err.lower():
            print("⚠️ Gemini quota/rate limit — using heuristic scoring")
        else:
            print("❌ Gemini eval error:", e)
        return _heuristic_evaluate(user_answer, question, tag)
