import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from deps.auth import get_current_user, require_verified_user
from models.schemas import (
    CleanTranscriptRequest,
    CleanTranscriptResponse,
    EvaluateAnswerRequest,
    EvaluateAnswerResponse,
    SessionCoachingRequest,
    SessionCoachingResponse,
    StartInterviewRequest,
    StartInterviewResponse,
)
from services.answer_evaluator import evaluate_answer
from services.fallback_content import get_fallback_questions
from services.gemini_budget import can_use_gemini, gemini_budget_status
from services.question_format import format_questions
from services.question_generator import generate_questions
from services.session_summary import build_session_coaching
from services.transcript_cleaner import clean_transcript
from services.usage_limits import can_start_interview, record_interview_start

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/gemini-budget-status")
async def gemini_budget_status_route(
    _user: Annotated[dict, Depends(get_current_user)],
):
    return await gemini_budget_status()


@router.post("/start-interview", response_model=StartInterviewResponse)
async def start_interview(
    data: StartInterviewRequest,
    user: Annotated[dict, Depends(require_verified_user)],
):
    allowed, limit_message = await can_start_interview(user["id"])
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"message": limit_message, "code": "DAILY_INTERVIEW_LIMIT"},
        )

    try:
        sections = data.sections.model_dump()
        role = data.role
        mode = data.mode
        job_description = data.job_description
        limit = 5 if mode == "quick" else 12

        gemini_ok = await can_use_gemini()
        force_fallback = not gemini_ok

        logger.info(
            "start_interview role=%s mode=%s user_email=%s",
            role,
            mode,
            user["email"],
        )

        using_fallback = force_fallback
        raw_output = await generate_questions(
            sections, role, mode, job_description, force_fallback=force_fallback
        )

        if not raw_output:
            logger.warning("start_interview empty_gemini_output using_fallback=true")
            formatted = get_fallback_questions(sections, role, mode, limit)
            using_fallback = True
        else:
            formatted = format_questions(raw_output, limit)
            if not formatted:
                formatted = get_fallback_questions(sections, role, mode, limit)
                using_fallback = True

        if len(formatted) < limit:
            seen = {q["question"] for q in formatted}
            for q in get_fallback_questions(sections, role, mode, limit):
                if len(formatted) >= limit:
                    break
                if q["question"] not in seen:
                    formatted.append(q)
                    seen.add(q["question"])
            if len(formatted) < limit:
                using_fallback = True

        session_id = str(uuid.uuid4())
        await record_interview_start(user["id"], mode, session_id)

        logger.info(
            "start_interview complete question_count=%s using_fallback=%s session_id=%s",
            len(formatted),
            using_fallback,
            session_id,
        )

        return StartInterviewResponse(
            questions=formatted,
            mode=mode,
            using_fallback=using_fallback,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("start_interview failed error=%s", e)
        limit = 5 if data.mode == "quick" else 12
        sections = data.sections.model_dump()
        return StartInterviewResponse(
            questions=get_fallback_questions(sections, data.role, data.mode, limit),
            mode=data.mode,
            using_fallback=True,
        )


@router.post("/clean-transcript", response_model=CleanTranscriptResponse)
async def clean_transcript_route(
    data: CleanTranscriptRequest,
    _user: Annotated[dict, Depends(require_verified_user)],
):
    raw = data.raw_transcript.strip()
    skills_hint = None
    if data.sections:
        skills_hint = ", ".join(data.sections.skills[:10])

    cleaned = await clean_transcript(
        raw_transcript=raw,
        question=data.question,
        skills_hint=skills_hint,
    )

    return CleanTranscriptResponse(
        cleaned_transcript=cleaned,
        raw_transcript=raw,
    )


@router.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
async def evaluate_answer_route(
    data: EvaluateAnswerRequest,
    _user: Annotated[dict, Depends(require_verified_user)],
):
    sections = data.sections.model_dump()
    force_fallback = not await can_use_gemini()
    result = await evaluate_answer(
        sections=sections,
        role=data.role,
        question=data.question,
        tag=data.tag,
        user_answer=data.user_answer,
        force_fallback=force_fallback,
    )
    return EvaluateAnswerResponse(**result)


@router.post("/session-coaching", response_model=SessionCoachingResponse)
async def session_coaching_route(
    data: SessionCoachingRequest,
    _user: Annotated[dict, Depends(get_current_user)],
):
    answers = [a.model_dump() for a in data.answers]
    coaching = build_session_coaching(answers, data.role, data.overall_score)
    return SessionCoachingResponse(**coaching)
