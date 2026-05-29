import google.generativeai as genai
from config.settings import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_questions(sections: dict, role: str):
    try:
        projects = "\n".join(sections.get("projects", [])[:3])
        skills = ", ".join(sections.get("skills", [])[:6])
        experience = "\n".join(sections.get("experience", [])[:5])

        prompt = f"""
Role: {role}

PROJECT QUESTIONS:
Generate 4 questions based on:
{projects}

SKILL QUESTIONS:
Generate 2 questions based on:
{skills}

EXPERIENCE QUESTIONS:
Generate 3 questions based on:
{experience}

ROLE QUESTIONS:
Generate 3 questions specific to {role}

Return ALL questions in plain text grouped under headings:
PROJECT, SKILL, EXPERIENCE, ROLE
"""

        response = model.generate_content(prompt)

        if not response or not response.text:
            return ""

        print("🧠 GEMINI RAW:", response.text)

        return response.text

    except Exception as e:
        print("❌ Gemini Error:", e)
        return ""