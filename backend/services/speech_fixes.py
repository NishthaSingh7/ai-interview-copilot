import re

# Order matters — more specific patterns first
_SPEECH_REPLACEMENTS: list[tuple[str, str]] = [
    (r"\bw\s*eb\s*r\s*t\s*c\b", "WebRTC"),
    (r"\bweb\s*r\s*t\s*c\b", "WebRTC"),
    (r"\bweb\s+rtc\b", "WebRTC"),
    (r"\bjava\s*script\b", "JavaScript"),
    (r"\btype\s*script\b", "TypeScript"),
    (r"\bnode\s*js\b", "Node.js"),
    (r"\bnode\s+j\s*s\b", "Node.js"),
    (r"\breact\s*js\b", "React"),
    (r"\bangular\s*js\b", "AngularJS"),
    (r"\bmongo\s*d\s*b\b", "MongoDB"),
    (r"\bpostgre\s*sql\b", "PostgreSQL"),
    (r"\bfast\s*api\b", "FastAPI"),
    (r"\bopen\s*ai\b", "OpenAI"),
    (r"\bgemini\s*api\b", "Gemini API"),
    (r"\bj\s*w\s*t\b", "JWT"),
    (r"\br\s*a\s*g\b", "RAG"),
    (r"\bllama\s*3\b", "Llama 3"),
    (r"\bllm\s*s\b", "LLMs"),
    (r"\bllm\b", "LLM"),
    (r"\bgroq\b", "Groq"),
    (r"\bmern\b", "MERN"),
    (r"\bo\s*llama\b", "Ollama"),
    (r"\blang\s*chain\b", "LangChain"),
    (r"\btensor\s*flow\b", "TensorFlow"),
    (r"\bgen\s*ai\b", "GenAI"),
    (r"\bgen\s+ai\b", "GenAI"),
    (r"\bv\s*it\b", "VIT"),
    (r"\bp\s*df\b", "PDF"),
    (r"\bapi\s*s\b", "APIs"),
    (r"\bapi\b", "API"),
    (r"\brest\s*ful\b", "RESTful"),
    (r"\bc\s*o\s*r\s*s\b", "CORS"),
    (r"\bbm\s*25\b", "BM25"),
]


def apply_local_speech_fixes(text: str) -> str:
    if not text:
        return ""

    t = text.strip()
    t = re.sub(r"\s+", " ", t)

    for pattern, replacement in _SPEECH_REPLACEMENTS:
        t = re.sub(pattern, replacement, t, flags=re.IGNORECASE)

    t = re.sub(r"\bi\b", "I", t)
    t = re.sub(r"\buh+\b", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\bum+\b", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\blike,\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s+", " ", t).strip()

    if t:
        t = t[0].upper() + t[1:]
        if not re.search(r"[.!?]$", t):
            t += "."

    return t
