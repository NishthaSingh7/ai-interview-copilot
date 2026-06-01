from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from deps.auth import get_current_user
from models.schemas import (
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
from services.email_service import send_verification_otp
from services.otp_service import count_recent_otp_sends, generate_otp_code, store_otp, verify_otp
from services.usage_limits import get_usage_status

router = APIRouter(prefix="/auth", tags=["auth"])


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
    sent = await send_verification_otp(data.email, code)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send verification email. Try again later.",
        )

    return MessageResponse(
        message="Account created. Check your email for a 6-digit verification code.",
    )


@router.post("/verify-email", response_model=AuthTokenResponse)
async def verify_email(data: VerifyEmailRequest):
    ok, msg = await verify_otp(data.email, data.otp)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    doc = await mark_email_verified(data.email)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

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
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many codes sent. Wait an hour and try again.",
        )

    code = generate_otp_code()
    await store_otp(data.email, code)
    sent = await send_verification_otp(data.email, code)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send email. Try again later.",
        )

    return MessageResponse(message="A new verification code was sent to your email.")


@router.post("/login", response_model=AuthTokenResponse)
async def login(data: LoginRequest):
    user = await authenticate_user(data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Verify your email before logging in.",
            },
        )

    token = create_access_token(user["id"])
    return AuthTokenResponse(access_token=token, user=_to_user_public(user))


@router.get("/me", response_model=UserPublic)
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return _to_user_public(user)


@router.get("/usage/today", response_model=UsageTodayResponse)
async def usage_today(user: Annotated[dict, Depends(get_current_user)]):
    status_data = await get_usage_status(user["id"])
    return UsageTodayResponse(**status_data)
