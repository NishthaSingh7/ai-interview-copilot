from fastapi import APIRouter
from models.schemas import StartInterviewRequest
from services.question_generator import generate_questions

router = APIRouter()


def format_questions(raw_output: str):
    lines = raw_output.split("\n")

    questions = []
    current_tag = "GENERAL"

    for line in lines:
        l = line.strip()

        if not l:
            continue

        # 🔥 Detect sections
        if "project" in l.lower():
            current_tag = "PROJECT"
            continue
        elif "skill" in l.lower():
            current_tag = "SKILL"
            continue
        elif "experience" in l.lower():
            current_tag = "EXPERIENCE"
            continue
        elif "role" in l.lower():
            current_tag = "ROLE"
            continue

        # 🔥 Clean formatting
        l = l.replace("*", "").strip()
        l = l.lstrip("0123456789. ").strip()

        if len(l) > 15:
            questions.append({
                "question": l,
                "tag": current_tag
            })

    return questions[:12]


@router.post("/start-interview")
async def start_interview(data: StartInterviewRequest):
    try:
        sections = data.sections.model_dump()
        role = data.role

        print("📊 SECTIONS:", sections)
        print("🎯 ROLE:", role)

        raw_output = generate_questions(sections, role)

        if not raw_output:
            print("⚠️ Empty Gemini output")

            return {
                "questions": [
                    {"question": "Tell me about your project.", "tag": "PROJECT"},
                    {"question": "Explain your tech stack.", "tag": "SKILL"},
                    {"question": "What challenges did you face?", "tag": "PROJECT"},
                    {"question": "What would you improve?", "tag": "EXPERIENCE"},
                    {"question": "What did you learn?", "tag": "ROLE"},
                ]
            }

        formatted = format_questions(raw_output)

        print("🧠 FINAL FORMATTED:", formatted)

        return {"questions": formatted}

    except Exception as e:
        print("❌ BACKEND ERROR:", e)

        return {
            "questions": [
                {"question": "Tell me about your project.", "tag": "PROJECT"},
                {"question": "Explain your tech stack.", "tag": "SKILL"},
            ]
        }