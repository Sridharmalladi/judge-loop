"""
TOGETHER AI ADAPTER — Wide model selection, some free inference.

Also follows OpenAI-compatible chat format.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError

TOGETHER_API_URL = "https://api.together.xyz/v1"

TOGETHER_MODELS = [
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen/Qwen2.5-7B-Instruct-Turbo",
    "google/gemma-2-9b-it",
]


class TogetherAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{TOGETHER_API_URL}/chat/completions",
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
            raise RateLimitError("together", 60.0)

        if response.status_code != 200:
            raise AdapterError("together", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model", model),
            "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": 0,
        }

    async def list_models(self) -> list[str]:
        return TOGETHER_MODELS
