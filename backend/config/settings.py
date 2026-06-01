import os

from dotenv import load_dotenv

load_dotenv()


def _normalize_email_from(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        return "Interview Copilot <onboarding@resend.dev>"
    if "<" not in value and "@" in value:
        return f"Interview Copilot <{value}>"
    return value


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in ("1", "true", "yes")

# MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "interview_copilot")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "dev-change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))

# Email (Resend) — https://resend.com/domains required for all recipient addresses
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = _normalize_email_from(os.getenv("EMAIL_FROM", ""))
# With onboarding@resend.dev, Resend only delivers to this address until you verify a domain.
RESEND_ALLOWED_TEST_EMAIL = os.getenv("RESEND_ALLOWED_TEST_EMAIL", "").lower().strip()
# Emergency only: return OTP in API when email fails (off by default).
OTP_FALLBACK_IN_API = os.getenv("OTP_FALLBACK_IN_API", "false").lower() in ("1", "true", "yes")

OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
OTP_MAX_VERIFY_ATTEMPTS = int(os.getenv("OTP_MAX_VERIFY_ATTEMPTS", "5"))
OTP_RESEND_MAX_PER_HOUR = int(os.getenv("OTP_RESEND_MAX_PER_HOUR", "3"))

# Usage limits
MAX_INTERVIEWS_PER_USER_PER_DAY = int(os.getenv("MAX_INTERVIEWS_PER_USER_PER_DAY", "1"))
GLOBAL_GEMINI_DAILY_CAP = int(os.getenv("GLOBAL_GEMINI_DAILY_CAP", "40"))
GEMINI_SPEECH_CLEAN = os.getenv("GEMINI_SPEECH_CLEAN", "false").lower() in ("1", "true", "yes")

# Legacy client rate limit (anonymous / disabled when auth required)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() in ("1", "true", "yes")
RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "30"))
RATE_LIMIT_WINDOW_SECONDS = RATE_LIMIT_WINDOW_MINUTES * 60

# CORS
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://ai-interview-co-pilot.netlify.app",
).split(",")

if not GEMINI_API_KEY and not DEMO_MODE:
    print("⚠️  GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env")

if DEMO_MODE:
    print("🎬 DEMO_MODE enabled — no Gemini API calls")

if not MONGODB_URI:
    print("⚠️  MONGODB_URI is not set — auth and usage limits require MongoDB")

if RESEND_API_KEY and "resend.dev" in EMAIL_FROM.lower() and not RESEND_ALLOWED_TEST_EMAIL:
    print(
        "⚠️  Resend test sender (resend.dev): set RESEND_ALLOWED_TEST_EMAIL to your Resend "
        "account email, or verify a domain at https://resend.com/domains"
    )
