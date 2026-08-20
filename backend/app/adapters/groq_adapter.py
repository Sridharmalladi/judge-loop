"""
GROQ ADAPTER — Fast inference for Llama and Mixtral models.

Groq's API follows the OpenAI chat completions format.
Free tier: ~30 RPM, varies by model.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError

GROQ_API_URL = "https://api.groq.com/openai/v1"

# Models available on Groq's free tier (may change)
GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "llama3-8b-8192",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]


class GroqAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "llama-3.1-8b-instant",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{GROQ_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )

        if response.status_code == 429:
            retry = response.headers.get("retry-after")
            raise RateLimitError("groq", float(retry) if retry else 60.0)

        if response.status_code != 200:
            raise AdapterError("groq", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model", model),
            "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": 0,  # Filled by _timed_generate
        }

    async def list_models(self) -> list[str]:
        return GROQ_MODELS
