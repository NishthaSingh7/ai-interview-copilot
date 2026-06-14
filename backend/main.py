from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import (
    CORS_ORIGINS,
    LOG_LEVEL,
    OBSERVABILITY_ENABLED,
    OTEL_DEPLOYMENT_ENVIRONMENT,
    OTEL_SERVICE_NAME,
    OTEL_SERVICE_VERSION,
)
from db.mongodb import close_db, init_db
from observability.config import (
    resolve_otlp_endpoint,
    resolve_otlp_headers,
    resolve_resource_attributes,
)
from observability.logging_config import configure_logging
from observability.otel import setup_observability, shutdown_observability
from routes.auth import router as auth_router
from routes.interview import router as interview_router
from routes.resume import router as resume_router

configure_logging(LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    shutdown_observability()
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

setup_observability(
    app,
    enabled=OBSERVABILITY_ENABLED,
    otlp_endpoint=resolve_otlp_endpoint(),
    service_name=OTEL_SERVICE_NAME,
    service_version=OTEL_SERVICE_VERSION,
    environment=OTEL_DEPLOYMENT_ENVIRONMENT,
    otlp_headers=resolve_otlp_headers(),
    resource_attributes=resolve_resource_attributes(),
)


@app.get("/")
def root():
    return {"message": "Backend is running"}
