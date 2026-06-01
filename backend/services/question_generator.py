from config.settings import DEMO_MODE
from services.gemini_client import generate_content_async


def _format_project_blocks(sections: dict) -> str:
    items = sections.get("project_items") or []
    if items:
        blocks = []
        for i, p in enumerate(items, 1):
            name = p.get("name") if isinstance(p, dict) else p.name
            details = p.get("details") if isinstance(p, dict) else p.details
            blocks.append(f"Project {i}: {name}\n{details[:1200]}")
        return "\n\n".join(blocks)

    return "\n".join(sections.get("projects", [])[:12])


def _demo_questions_output(sections: dict, role: str, mode: str) -> str:
    """Fixed interview script for screen recording — no API."""
    projects = sections.get("project_items") or []
    names = []
    for p in projects:
        n = p.get("name") if isinstance(p, dict) else getattr(p, "name", "")
        if n:
            names.append(n.split("—")[0].strip())
    if not names:
        names = ["your main project"]

    p1, p2 = names[0], names[1] if len(names) > 1 else names[0]

    if mode == "quick":
        return f"""SUMMARY
1. Your summary positions you as a GenAI full-stack engineer — what measurable impact from {p1} best proves you are ready for {role}?

PROJECT
1. On {p1}, what was the hardest trade-off between local LLM inference and cloud APIs, and how did you validate the decision in production?

SKILL
1. How would you harden a MERN + JWT stack when adding real-time WebRTC and LLM endpoints under concurrent exam traffic?

EXPERIENCE
1. At Probability Gaming, describe a production incident where React and microservices drifted — how did you debug, fix, and prevent recurrence?

ROLE
1. As a {role}, how would you design observability and error handling across frontend, API, and AI services for a live interview-style product?
"""

    return f"""SUMMARY
1. Walk through your professional narrative: why does your GenAI + MERN background make you a strong {role} hire in the next 90 days?

PROJECT
1. For {p1}, explain the hybrid AI architecture (RAG, local vs cloud LLMs) and one failure mode you had to fix before launch?
2. For {p2}, how did you keep speech-to-text and Gemini pipelines reliable when user audio quality was poor or ambiguous?
3. On {p1}, how did WebRTC proctoring interact with JWT multi-tenancy — what security threat worried you most?

SKILL
1. Compare when you would choose MongoDB vs PostgreSQL for an AI-heavy product — what schema and indexing choices matter at scale?
2. How do you prevent prompt injection and hallucinated outputs from reaching end users in a production LLM feature?

EXPERIENCE
1. At Probability Gaming, what was your approach to reusable React components across teams — how did you measure the 25% velocity gain?
2. At Outlier AI, how did you benchmark LLM quality — what metrics separated a shippable prompt from a failing one?
3. As an independent Gen AI developer, how do you prioritize shipping features vs hardening RAG and agent reliability?

ROLE
1. Design the backend for a live mock-interview coach: how do queues, rate limits, and fallbacks protect you when the LLM API fails?
2. What would you ship in week one vs week four for a {role} joining a team with an existing MERN monolith?
3. How do you balance UX polish with API cost when every answer triggers multiple LLM calls?
"""


async def generate_questions(
    sections: dict,
    role: str,
    mode: str = "full",
    job_description: str | None = None,
    force_fallback: bool = False,
):
    if DEMO_MODE or force_fallback:
        print("🎬 Using local demo questions (no Gemini)")
        return _demo_questions_output(sections, role, mode)

    try:
        summary = "\n".join(sections.get("summary", [])[:6])
        project_blocks = _format_project_blocks(sections)
        skills = "\n".join(sections.get("skills", [])[:10])
        experience = "\n".join(sections.get("experience", [])[:14])

        project_names = []
        for p in sections.get("project_items") or []:
            name = p.get("name") if isinstance(p, dict) else getattr(p, "name", "")
            if name:
                project_names.append(name)

        diversity_rule = ""
        if len(project_names) >= 2:
            diversity_rule = (
                f"PROJECT questions: each must target a DIFFERENT project. "
                f"Use only: {', '.join(project_names)}. "
                f"Name the project in the question."
            )
        elif len(project_names) == 1:
            diversity_rule = f"One project available ({project_names[0]}). Ask one hard PROJECT question about it."

        if mode == "quick":
            counts = "1 SUMMARY, 1 PROJECT, 1 SKILL, 1 EXPERIENCE, 1 ROLE (5 total — every resume section)"
            summary_n, project_n, skill_n, exp_n, role_n = 1, 1, 1, 1, 1
        else:
            counts = (
                "1 SUMMARY, 3 PROJECT, 2 SKILL, 3 EXPERIENCE, 3 ROLE "
                "(12 total — cover all resume sections)"
            )
            summary_n, project_n, skill_n, exp_n, role_n = 1, 3, 2, 3, 3

        jd_block = ""
        if job_description and job_description.strip():
            jd = job_description.strip()[:6000]
            jd_block = f"""
TARGET JOB DESCRIPTION (align at least 2 questions to this):
{jd}
"""

        prompt = f"""
Generate a challenging mock interview for role: {role}. Mode: {mode.upper()} ({counts}).

DIFFICULTY (mid–senior, not beginner):
- Questions should probe trade-offs, failure modes, scalability, security, or "why not X?"
- Reference specific names from the resume (projects, companies, technologies).
- Avoid textbook definitions; ask what THEY did and why.
- Each question must be answerable in ~3 minutes of speech but require real depth.

STRICT FORMAT RULES:
1. Exactly ONE question per numbered line — never combine two questions in one line.
2. 28–45 words per question (substantive, not one-liners).
3. One question mark per line.
4. Do NOT use: "and how", "and what", "also tell me", "as well as".
5. SUMMARY = career narrative / GenAI-full-stack fit for {role}.
6. PROJECT = one named project. SKILL = one tech stack area. EXPERIENCE = one job/company. ROLE = {role} fit, system design, or leadership.

{diversity_rule}

{jd_block}
PROFESSIONAL SUMMARY:
{summary or "(none — infer from experience)"}

PROJECTS:
{project_blocks or "(none)"}

SKILLS:
{skills or "(none)"}

EXPERIENCE (jobs):
{experience or "(none)"}

Generate exactly:
- {summary_n} SUMMARY question(s)
- {project_n} PROJECT question(s)
- {skill_n} SKILL question(s)
- {exp_n} EXPERIENCE question(s)
- {role_n} ROLE question(s)

Output format — section header on its own line, then numbered questions:

SUMMARY
1. ...

PROJECT
1. ...

SKILL
1. ...

EXPERIENCE
1. ...

ROLE
1. ...
"""

        response = await generate_content_async(prompt)

        if not response or not response.text:
            return ""

        print("🧠 GEMINI RAW:", response.text)

        return response.text

    except Exception as e:
        print("❌ Gemini Error:", e, "— using demo question set")
        return _demo_questions_output(sections, role, mode)
