from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import CORS_ORIGINS
from db.mongodb import close_db, init_db
from routes.auth import router as auth_router
from routes.interview import router as interview_router
from routes.resume import router as resume_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(resume_router)


@app.get("/")
def root():
    return {"message": "Backend is running"}
