import re

FALLBACK_QUESTIONS = [
    {
        "question": "Walk me through your professional summary and why your background is a strong fit for this role — what would you prove in the first 90 days?",
        "tag": "SUMMARY",
    },
    {
        "question": "Pick your strongest project: what was the hardest architectural trade-off you made, and what would you redo if you rebuilt it today?",
        "tag": "PROJECT",
    },
    {
        "question": "When you combined React, Node, and an LLM API in production, what broke first under load or bad inputs, and how did you harden the system?",
        "tag": "SKILL",
    },
    {
        "question": "At your most recent job, describe one production incident — how did you debug, fix, and prevent recurrence?",
        "tag": "EXPERIENCE",
    },
    {
        "question": "For this role, how would you design a feature end-to-end while keeping security, observability, and UX consistent across the stack?",
        "tag": "ROLE",
    },
]


def detect_question_section(line: str) -> str | None:
    cleaned = re.sub(r"[*#_\-:]+", " ", line.strip()).upper()
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if re.match(r"^SUMMAR(Y|IES)\s*(QUESTIONS?)?\s*$", cleaned):
        return "SUMMARY"
    if re.match(r"^PROFILE\s*(QUESTIONS?)?\s*$", cleaned):
        return "SUMMARY"
    if re.match(r"^PROJECTS?\s*(QUESTIONS?)?\s*$", cleaned):
        return "PROJECT"
    if re.match(r"^SKILLS?\s*(QUESTIONS?)?\s*$", cleaned):
        return "SKILL"
    if re.match(r"^EXPERIENCES?\s*(QUESTIONS?)?\s*$", cleaned):
        return "EXPERIENCE"
    if re.match(r"^ROLES?\s*(QUESTIONS?)?\s*$", cleaned):
        return "ROLE"
    return None


_COMPOUND_SPLITTERS = [
    r"\s+and\s+how\b",
    r"\s+and\s+what\b",
    r"\s+and\s+why\b",
    r"\s+also[,]?\s+tell\b",
    r"\s+as\s+well\s+as\b",
    r"\s*;\s*",
    r"\?\s+(?:Additionally|Also|Further)\b",
]


def normalize_question_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    for pattern in _COMPOUND_SPLITTERS:
        parts = re.split(pattern, text, maxsplit=1, flags=re.IGNORECASE)
        if len(parts) > 1 and parts[0].strip():
            text = parts[0].strip()
            break

    if text.count("?") > 1:
        first = text.find("?")
        text = text[: first + 1]

    if text and not text.endswith("?"):
        text = text.rstrip("., ") + "?"

    if len(text) > 320:
        text = text[:317].rstrip() + "?"

    return text


def format_questions(raw_output: str, limit: int = 12) -> list[dict]:
    lines = raw_output.split("\n")
    questions: list[dict] = []
    current_tag = "GENERAL"

    for line in lines:
        l = line.strip()
        if not l:
            continue

        section = detect_question_section(l)
        if section:
            current_tag = section
            continue

        l = l.replace("*", "").strip()
        l = re.sub(r"^\d+[\).\]]\s*", "", l).strip()
        l = normalize_question_text(l)

        if len(l) > 15:
            questions.append({"question": l, "tag": current_tag})

    return questions[:limit]
