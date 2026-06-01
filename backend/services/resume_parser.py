import io
import re

from pypdf import PdfReader


def extract_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            parts.append(t)
    return "\n".join(parts)


def _normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip())


def _detect_section(line: str) -> str | None:
    l = _normalize_line(line).lower()

    if re.match(r"^professional\s+summary\s*$", l):
        return "summary"
    if re.match(r"^technical\s+skills?\s*$", l):
        return "skills"
    if re.match(r"^professional\s+experience\s*$", l):
        return "experience"
    if re.match(r"^work\s+experience\s*$", l):
        return "experience"
    if re.match(r"^projects?\s*$", l):
        return "projects"
    if re.match(r"^education\s*$", l):
        return "education"
    if re.match(r"^certifications?(?:\s*&\s*learning)?\s*$", l):
        return "certifications"

    return None


def _is_project_title(line: str) -> bool:
    """Lines like 'Nish-ed — AI-Powered...' or 'After Noise — ...'"""
    if "—" in line or " – " in line:
        name = re.split(r"—|–", line, maxsplit=1)[0].strip()
        if 3 < len(name) < 70 and not line.startswith("•"):
            return True
    return False


def _split_projects(lines: list[str]) -> list[dict]:
    """Group resume project bullets under separate project names."""
    items: list[dict] = []
    current_name: str | None = None
    current_lines: list[str] = []

    def flush():
        nonlocal current_name, current_lines
        if current_name and current_lines:
            items.append(
                {
                    "name": current_name,
                    "details": "\n".join(current_lines[:6]),
                }
            )
        current_name = None
        current_lines = []

    for line in lines:
        if _is_project_title(line):
            flush()
            current_name = re.split(r"—|–", line, maxsplit=1)[0].strip()
            rest = re.split(r"—|–", line, maxsplit=1)
            if len(rest) > 1 and rest[1].strip():
                current_lines.append(rest[1].strip())
            continue
        if current_name:
            current_lines.append(line)

    flush()

    if not items and lines:
        items.append({"name": "Primary project", "details": "\n".join(lines[:8])})

    return items[:6]


def parse_resume(file_bytes: bytes) -> dict:
    text = extract_text(file_bytes)

    sections: dict[str, list[str]] = {
        "summary": [],
        "projects": [],
        "skills": [],
        "experience": [],
    }

    current: str | None = None

    for raw_line in text.split("\n"):
        line = _normalize_line(raw_line)
        if len(line) < 3:
            continue

        header = _detect_section(line)
        if header:
            if header in sections:
                current = header
            else:
                current = None
            continue

        if current and len(line) > 5:
            sections[current].append(line)

    sections["projects"] = sections["projects"][:20]
    sections["skills"] = sections["skills"][:12]
    sections["experience"] = sections["experience"][:25]
    sections["summary"] = sections["summary"][:6]

    project_items = _split_projects(sections["projects"])

    print(
        "📊 FINAL JSON:",
        {k: len(v) for k, v in sections.items()},
        "projects_split:",
        [p["name"] for p in project_items],
    )

    return {
        **sections,
        "project_items": project_items,
    }
