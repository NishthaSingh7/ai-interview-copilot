import httpx

from config.settings import (
    EMAIL_FROM,
    OTP_EXPIRE_MINUTES,
    OTP_LOG_ON_SEND_FAILURE,
    RESEND_API_KEY,
)


async def send_verification_otp(email: str, code: str) -> bool:
    subject = "Verify your email — Interview Copilot"
    html = f"""
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{code}</p>
    <p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>
    <p>If you did not sign up, ignore this email.</p>
    """

    if not RESEND_API_KEY:
        print(f"📧 [DEV] OTP for {email}: {code}")
        return True

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
            if OTP_LOG_ON_SEND_FAILURE:
                print(f"📧 [OTP fallback] Verification code for {email}: {code}")
                return True
            return False
        return True
