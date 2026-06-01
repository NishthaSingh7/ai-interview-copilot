from dataclasses import dataclass

import httpx

from config.settings import (
    EMAIL_FROM,
    OTP_EXPIRE_MINUTES,
    OTP_FALLBACK_IN_API,
    RESEND_ALLOWED_TEST_EMAIL,
    RESEND_API_KEY,
)


@dataclass
class OtpSendResult:
    email_sent: bool
    verification_code: str | None = None
    delivery_note: str | None = None


def _uses_resend_test_domain() -> bool:
    return "resend.dev" in EMAIL_FROM.lower()


def _test_mode_recipient_blocked(recipient: str) -> str | None:
    """Optional pre-check when RESEND_ALLOWED_TEST_EMAIL is set on Railway."""
    if not _uses_resend_test_domain():
        return None
    allowed = RESEND_ALLOWED_TEST_EMAIL
    if not allowed:
        # No pre-block — call Resend API (works for your Resend account email with just the API key).
        return None
    if recipient.lower().strip() != allowed:
        return (
            f"Resend test mode only sends OTP to {allowed}. "
            f"Sign up with that email, or verify your domain at https://resend.com/domains "
            f"and set EMAIL_FROM to e.g. Interview Copilot <noreply@yourdomain.com>."
        )
    return None


async def send_verification_otp(email: str, code: str) -> OtpSendResult:
    recipient = email.lower().strip()
    blocked = _test_mode_recipient_blocked(recipient)
    if blocked:
        print(f"📧 [Resend] Blocked test send to {recipient}: {blocked}")
        return OtpSendResult(
            email_sent=False,
            verification_code=code if OTP_FALLBACK_IN_API else None,
            delivery_note=blocked,
        )

    subject = "Verify your email — Interview Copilot"
    html = f"""
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{code}</p>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    <p>If you did not sign up, ignore this email.</p>
    """

    if not RESEND_API_KEY:
        note = "RESEND_API_KEY is not set on the server."
        print(f"📧 [Resend] {note} OTP for {recipient}: {code}")
        return OtpSendResult(
            email_sent=False,
            verification_code=code if OTP_FALLBACK_IN_API else None,
            delivery_note=note,
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": EMAIL_FROM,
                    "to": [recipient],
                    "subject": subject,
                    "html": html,
                },
                timeout=15.0,
            )
            if response.status_code >= 400:
                print("❌ Resend error:", response.status_code, response.text)
                note = _parse_resend_error(response.status_code, response.text)
                print(f"📧 [OTP] Could not email {recipient}: {note}")
                return OtpSendResult(
                    email_sent=False,
                    verification_code=code if OTP_FALLBACK_IN_API else None,
                    delivery_note=note,
                )
            return OtpSendResult(email_sent=True)
    except Exception as exc:
        print("❌ Resend request failed:", exc)
        note = "Could not reach Resend. Try again in a minute."
        return OtpSendResult(
            email_sent=False,
            verification_code=code if OTP_FALLBACK_IN_API else None,
            delivery_note=note,
        )


def _parse_resend_error(status: int, body: str) -> str:
    if status == 403 and "resend.dev" in body.lower():
        return (
            "Resend blocked this recipient. Verify a domain at https://resend.com/domains "
            "and update EMAIL_FROM on Railway, or use your Resend account email for testing."
        )
    if status == 401:
        return "Invalid RESEND_API_KEY on Railway — create a new key at https://resend.com/api-keys"
    if status == 422:
        return "Invalid EMAIL_FROM on Railway — use a verified sender address from Resend → Domains."
    return "Resend could not send this email. Check Railway variables and https://resend.com/domains"
