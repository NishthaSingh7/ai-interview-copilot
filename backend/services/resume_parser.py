from pypdf import PdfReader
import io

def extract_text(file_bytes: bytes):
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""

    for page in reader.pages:
        t = page.extract_text()
        if t:
            text += t + "\n"

    return text


def parse_resume(file_bytes: bytes):
    text = extract_text(file_bytes)

    sections = {
        "projects": [],
        "skills": [],
        "experience": []
    }

    current = None

    for line in text.split("\n"):
        l = line.strip()
        lower = l.lower()

        if "project" in lower:
            current = "projects"
            continue
        elif "skill" in lower:
            current = "skills"
            continue
        elif "experience" in lower:
            current = "experience"
            continue

        if current and len(l) > 5:
            sections[current].append(l)

    print("📊 FINAL JSON:", sections)

    return sections