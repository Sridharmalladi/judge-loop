"""
OPENROUTER ADAPTER — One key, many free models.

OpenRouter follows the OpenAI chat completions format and proxies to many
underlying providers. Models suffixed ":free" cost nothing to call.
Free tier: 20 requests/min, 50 requests/day (jumps to 1,000/day permanently
after ever adding $10 credit — none of it has to be spent).

The free-model lineup rotates as providers' promotional windows change —
verify current IDs at https://openrouter.ai/models?max_price=0 and adjust
OPENROUTER_MODELS below if one of these gets pulled.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError

OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

# Free-tier models (":free" suffix = $0/token). Rotates — check the URL above.
OPENROUTER_MODELS = [
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "qwen/qwen-2.5-72b-instruct:free",
]


class OpenRouterAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "deepseek/deepseek-r1:free",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OPENROUTER_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    # OpenRouter uses these to attribute traffic on their
                    # public leaderboard — optional, not required for auth.
                    "HTTP-Referer": "https://github.com/Sridharmalladi/judge-loop",
                    "X-Title": "Judge Loop",
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
            raise RateLimitError("openrouter", float(retry) if retry else 60.0)

        if response.status_code != 200:
            raise AdapterError("openrouter", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model", model),
            "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": 0,
        }

    async def list_models(self) -> list[str]:
        return OPENROUTER_MODELS
