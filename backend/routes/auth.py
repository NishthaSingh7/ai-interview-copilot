from typing import Annotated
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from deps.auth import get_current_user
from models.schemas import (
    AccountStatusRequest,
    AccountStatusResponse,
    AuthTokenResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendOtpRequest,
    UsageTodayResponse,
    UserPublic,
    VerifyEmailRequest,
)
from config.settings import OTP_RESEND_MAX_PER_HOUR
from services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_user_by_email,
    mark_email_verified,
)
from services.email_service import OtpSendResult, send_verification_otp
from services.otp_service import count_recent_otp_sends, generate_otp_code, store_otp, verify_otp
from services.usage_limits import get_usage_status

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _public_otp_hint(delivery: OtpSendResult) -> str | None:
    if delivery.email_sent:
        return None
    if delivery.verification_code:
        return "Enter the verification code below to continue."
    return "Tap Resend code to get a new verification code."


def _otp_response(
    delivery: OtpSendResult,
    *,
    success_message: str,
    failure_message: str,
) -> MessageResponse:
    if delivery.log_detail:
        logger.info("otp_delivery detail=%s email_sent=%s", delivery.log_detail, delivery.email_sent)
    if delivery.email_sent:
        return MessageResponse(message=success_message, email_sent=True)
    return MessageResponse(
        message=failure_message,
        email_sent=False,
        verification_code=delivery.verification_code,
        delivery_note=_public_otp_hint(delivery),
    )


def _to_user_public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        email=user["email"],
        name=user.get("name"),
        email_verified=user.get("email_verified", False),
    )


@router.post("/register", response_model=MessageResponse)
async def register(data: RegisterRequest):
    try:
        await create_user(data.email, data.password, data.name)
    except ValueError as e:
        if str(e) == "EMAIL_EXISTS":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from e
        raise

    code = generate_otp_code()
    await store_otp(data.email, code)
    delivery = await send_verification_otp(data.email, code)
    logger.info("auth_register email=%s otp_sent=%s", data.email, delivery.email_sent)
    return _otp_response(
        delivery,
        success_message="Account created. Check your email for a 6-digit verification code.",
        failure_message="Account created, but we could not email your verification code.",
    )


@router.post("/verify-email", response_model=AuthTokenResponse)
async def verify_email(data: VerifyEmailRequest):
    ok, msg = await verify_otp(data.email, data.otp)
    if not ok:
        logger.warning("auth_verify_email_failed email=%s reason=%s", data.email, msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    doc = await mark_email_verified(data.email)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    logger.info("auth_verify_email_success email=%s", data.email)

    user = {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name"),
        "email_verified": True,
    }
    token = create_access_token(user["id"])
    return AuthTokenResponse(access_token=token, user=_to_user_public(user))


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(data: ResendOtpRequest):
    doc = await get_user_by_email(data.email)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if doc.get("email_verified"):
        return MessageResponse(message="Email is already verified. You can log in.")

    recent = await count_recent_otp_sends(data.email, hours=1)
    if recent >= OTP_RESEND_MAX_PER_HOUR:
        logger.warning("auth_resend_otp_rate_limited email=%s recent_sends=%s", data.email, recent)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many codes sent. Wait an hour and try again.",
        )

    code = generate_otp_code()
    await store_otp(data.email, code)
    delivery = await send_verification_otp(data.email, code)
    logger.info("auth_resend_otp email=%s otp_sent=%s", data.email, delivery.email_sent)
    return _otp_response(
        delivery,
        success_message="A new verification code was sent to your email.",
        failure_message="We could not email a verification code.",
    )


@router.post("/account-status", response_model=AccountStatusResponse)
async def account_status(data: AccountStatusRequest):
    doc = await get_user_by_email(data.email)
    if not doc:
        return AccountStatusResponse(exists=False, email_verified=False)
    return AccountStatusResponse(
        exists=True,
        email_verified=bool(doc.get("email_verified")),
    )


@router.post("/login", response_model=AuthTokenResponse)
async def login(data: LoginRequest):
    user = await authenticate_user(data.email, data.password)
    if not user:
        logger.warning("auth_login_failed email=%s reason=invalid_credentials", data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.get("email_verified"):
        logger.warning("auth_login_blocked email=%s reason=email_not_verified", data.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Verify your email before logging in.",
            },
        )

    token = create_access_token(user["id"])
    logger.info("auth_login_success email=%s", data.email)
    return AuthTokenResponse(access_token=token, user=_to_user_public(user))


@router.get("/me", response_model=UserPublic)
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return _to_user_public(user)


@router.get("/usage/today", response_model=UsageTodayResponse)
async def usage_today(user: Annotated[dict, Depends(get_current_user)]):
    status_data = await get_usage_status(user["id"])
    return UsageTodayResponse(**status_data)
