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
from .base import ModelAdapter, AdapterError, RateLimitError, extract_openai_content, parse_retry_after

OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

# Free-tier models (":free" suffix = $0/token). Rotates — verified live
# against GET /api/v1/models on 2026-08-20; re-check the URL above if one
# of these starts 404ing with "unavailable for free."
#
# gpt-oss-20b and nemotron are reasoning models: they spend completion
# tokens on an internal "reasoning" field before the final answer, and can
# exhaust max_tokens mid-thought with no visible content at all (finish_reason
# "length", content: null). Fine to offer, but not as the default — a plain
# instruct model behaves predictably at low token budgets.
OPENROUTER_MODELS = [
    "google/gemma-4-31b-it:free",
    "z-ai/glm-5.2:free",
    "liquid/lfm-2.5-2.6b:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
]


class OpenRouterAdapter(ModelAdapter):

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "google/gemma-4-31b-it:free",
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
            raise RateLimitError("openrouter", parse_retry_after(response.headers.get("retry-after")))

        if response.status_code != 200:
            raise AdapterError("openrouter", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        content, used_model = extract_openai_content(data, "openrouter", model)
        return {
            "content": content,
            "model": used_model,
            "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": 0,
        }

    async def list_models(self) -> list[str]:
        return OPENROUTER_MODELS
