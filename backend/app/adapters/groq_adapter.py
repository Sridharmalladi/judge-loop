"""
GROQ ADAPTER — Fast inference, OpenAI-compatible.

Free tier: ~30 RPM, varies by model.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError

GROQ_API_URL = "https://api.groq.com/openai/v1"

# Verified live against GET /v1/models on 2026-08-20 — Groq's earlier
# llama-3.1/llama3/mixtral/gemma2 lineup has since been fully deprecated.
# gpt-oss-20b/120b are reasoning models: they can spend the whole
# max_tokens budget on internal "reasoning" and return content: null —
# see the fallback in generate() below.
GROQ_MODELS = [
    "groq/compound-mini",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "allam-2-7b",
]


class GroqAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "groq/compound-mini",
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
        message = data["choices"][0]["message"]
        # Reasoning models (gpt-oss-*) can hit max_tokens mid-thought and
        # return content: null with the partial thinking under "reasoning"
        # instead — surface that rather than crash downstream on null.
        content = message.get("content") or message.get("reasoning") or ""
        return {
            "content": content,
            "model": data.get("model", model),
            "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": 0,  # Filled by _timed_generate
        }

    async def list_models(self) -> list[str]:
        return GROQ_MODELS
