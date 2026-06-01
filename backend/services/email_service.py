from dataclasses import dataclass

import httpx

from config.settings import EMAIL_FROM, OTP_EXPIRE_MINUTES, RESEND_API_KEY


@dataclass
class OtpSendResult:
    email_sent: bool
    verification_code: str | None = None


async def send_verification_otp(email: str, code: str) -> OtpSendResult:
    """Send OTP email. Never raises — returns code for in-app display when email fails."""
    subject = "Verify your email — Interview Copilot"
    html = f"""
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{code}</p>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    <p>If you did not sign up, ignore this email.</p>
    """

    if not RESEND_API_KEY:
        print(f"📧 [OTP] No RESEND_API_KEY — code for {email}: {code}")
        return OtpSendResult(email_sent=False, verification_code=code)

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
                    "to": [email],
                    "subject": subject,
                    "html": html,
                },
                timeout=15.0,
            )
            if response.status_code >= 400:
                print("❌ Resend error:", response.status_code, response.text)
                print(
                    "   Tip: With onboarding@resend.dev you can only email your Resend account address "
                    "until you verify a domain. Set EMAIL_FROM to a verified sender."
                )
                print(f"📧 [OTP fallback] Verification code for {email}: {code}")
                return OtpSendResult(email_sent=False, verification_code=code)
            return OtpSendResult(email_sent=True)
    except Exception as exc:
        print("❌ Resend request failed:", exc)
        print(f"📧 [OTP fallback] Verification code for {email}: {code}")
        return OtpSendResult(email_sent=False, verification_code=code)
