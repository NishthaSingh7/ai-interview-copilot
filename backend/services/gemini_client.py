import asyncio
from concurrent.futures import ThreadPoolExecutor

import google.generativeai as genai

from config.settings import GEMINI_API_KEY, GEMINI_MODEL

_model = None
_executor = ThreadPoolExecutor(max_workers=4)


def get_model():
    global _model
    if _model is None:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(GEMINI_MODEL)
    return _model


async def generate_content_async(prompt: str):
    """
    Call Gemini if daily budget allows; otherwise return None.
    Caller must use fallbacks when None.
    """
    from services.gemini_budget import can_use_gemini, record_gemini_call

    if not await can_use_gemini():
        print("⚠️ Global Gemini daily cap reached — using fallback")
        return None

    model = get_model()
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        _executor,
        lambda: model.generate_content(prompt),
    )
    await record_gemini_call()
    return response
