"""
GEMINI ADAPTER — Google's Generative AI API.

Different format from OpenAI — Gemini uses generateContent endpoint.
Free tier: 15 RPM for Gemini Flash.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

GEMINI_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3.6-flash",
]


class GeminiAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "gemini-1.5-flash",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        # Gemini uses a different request format than OpenAI
        contents = []
        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System instruction: {system_prompt}"}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will follow these instructions."}]
            })
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        url = f"{GEMINI_API_URL}/models/{model}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    },
                },
            )

        if response.status_code == 429:
            raise RateLimitError("gemini", 60.0)

        if response.status_code != 200:
            raise AdapterError("gemini", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise AdapterError("gemini", f"Unexpected response format: {data}")

        return {
            "content": text,
            "model": model,
            "tokens_used": data.get("usageMetadata", {}).get("totalTokenCount", 0),
            "latency_ms": 0,
        }

    async def list_models(self) -> list[str]:
        return GEMINI_MODELS
