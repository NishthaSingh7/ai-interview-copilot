from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class ProjectItem(BaseModel):
    name: str
    details: str = ""


class ResumeSections(BaseModel):
    summary: list[str] = []
    projects: list[str] = []
    skills: list[str] = []
    experience: list[str] = []
    project_items: list[ProjectItem] = []


class QuestionItem(BaseModel):
    question: str
    tag: str


class StartInterviewRequest(BaseModel):
    sections: ResumeSections
    role: str
    mode: Literal["quick", "full"] = "full"
    job_description: Optional[str] = Field(default=None, max_length=6000)


class StartInterviewResponse(BaseModel):
    questions: list[QuestionItem]
    mode: Literal["quick", "full"]
    using_fallback: bool = False


class EvaluateAnswerRequest(BaseModel):
    role: str
    sections: ResumeSections
    question: str
    tag: str
    user_answer: str


class EvaluateAnswerResponse(BaseModel):
    score: int
    strengths: list[str]
    improvements: list[str]
    model_answer_snippet: str
    degraded: bool = False


class CleanTranscriptRequest(BaseModel):
    raw_transcript: str
    question: Optional[str] = None
    sections: Optional[ResumeSections] = None


class CleanTranscriptResponse(BaseModel):
    cleaned_transcript: str
    raw_transcript: str


class SessionAnswerItem(BaseModel):
    tag: str
    score: int
    strengths: list[str] = []
    improvements: list[str] = []
    question: str = ""
    degraded: bool = False


class SessionCoachingRequest(BaseModel):
    role: str
    overall_score: float
    answers: list[SessionAnswerItem]


class SessionCoachingResponse(BaseModel):
    headline: str
    coaching: str
    focus_areas: list[str]
    degraded: bool = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: EmailStr


class AccountStatusRequest(BaseModel):
    email: EmailStr


class AccountStatusResponse(BaseModel):
    exists: bool
    email_verified: bool


class UserPublic(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    email_verified: bool = False


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class MessageResponse(BaseModel):
    message: str
    email_sent: bool = True
    verification_code: Optional[str] = Field(default=None, max_length=6)
    delivery_note: Optional[str] = Field(default=None, max_length=500)


class UsageTodayResponse(BaseModel):
    usage_date: str
    interviews_used_today: int
    interviews_allowed_per_day: int
    can_start_interview: bool
    limit_message: Optional[str] = None
    next_reset_note: str = "Daily limit resets at midnight UTC"
    resets_at_utc: Optional[str] = None
    resets_at_display: Optional[str] = None
