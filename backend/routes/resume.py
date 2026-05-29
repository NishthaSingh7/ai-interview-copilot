from fastapi import APIRouter, UploadFile, File
from services.resume_parser import parse_resume

router = APIRouter()

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    contents = await file.read()

    sections = parse_resume(contents)

    return {
        "sections": sections
    }