from pydantic import BaseModel


class ResumeSections(BaseModel):
    projects: list[str] = []
    skills: list[str] = []
    experience: list[str] = []


class StartInterviewRequest(BaseModel):
    sections: ResumeSections
    role: str
