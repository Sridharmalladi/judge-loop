"""
HUGGING FACE ADAPTER — Inference Providers router, OpenAI-compatible.

https://router.huggingface.co/v1/chat/completions accepts the same
request/response shape as Groq/OpenRouter, so this shares their helpers.

Backed by 1+ API keys (HUGGINGFACE_API_KEYS, comma-separated). A
429/401/403 rotates to the next key and retries before giving up —
that's the whole point of having more than one free-tier token.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError, extract_openai_content, parse_retry_after
from .key_rotator import KeyRotator

HUGGINGFACE_API_URL = "https://router.huggingface.co/v1"

# From HF's own "recommended models" list for chat completion
# (huggingface.co/docs/inference-providers/tasks/chat-completion, checked
# 2026-08-20) — these have multiple provider backends behind the router,
# so they're the least likely to come back 404 on a given day.
HUGGINGFACE_MODELS = [
    "meta-llama/Llama-3.1-8B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct-1M",
    "google/gemma-2-2b-it",
    "openai/gpt-oss-120b",
]


class HuggingFaceAdapter(ModelAdapter):
    def __init__(self, keys: list[str]):
        super().__init__(keys[0])  # base ctor wants a single key; real selection is via _rotator
        self._rotator = KeyRotator("huggingface", keys)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "meta-llama/Llama-3.1-8B-Instruct",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        last_error: Optional[Exception] = None
        for attempt in range(len(self._rotator)):
            key = self._rotator.current
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{HUGGINGFACE_API_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key}",
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
                last_error = RateLimitError("huggingface", parse_retry_after(response.headers.get("retry-after")))
            elif response.status_code in (401, 403):
                last_error = AdapterError("huggingface", f"key rejected (HTTP {response.status_code})", response.status_code)
            elif response.status_code != 200:
                raise AdapterError("huggingface", f"HTTP {response.status_code}: {response.text}", response.status_code)
            else:
                data = response.json()
                content, used_model = extract_openai_content(data, "huggingface", model)
                return {
                    "content": content,
                    "model": used_model,
                    "tokens_used": data.get("usage", {}).get("total_tokens", 0),
                    "latency_ms": 0,  # Filled by _timed_generate
                }

            if attempt < len(self._rotator) - 1:
                self._rotator.rotate()

        raise last_error

    async def list_models(self) -> list[str]:
        return HUGGINGFACE_MODELS
