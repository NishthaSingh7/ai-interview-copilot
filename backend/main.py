from fastapi import FastAPI
from routes.interview import router as interview_router
from routes.resume import router as resume_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (dev only)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(interview_router)

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}


app.include_router(resume_router)