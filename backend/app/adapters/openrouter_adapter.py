"""
OPENROUTER ADAPTER — One key, free models plus a couple of cheap paid ones.

OpenRouter follows the OpenAI chat completions format and proxies to many
underlying providers. Models suffixed ":free" cost nothing to call but share
a tight rate limit (20/min, 50/day — 1,000/day after ever adding $10
credit). The two non-free models listed first are paid — a few thousandths
of a cent per call — and have their own separate, far higher limit tied to
account balance rather than the free-tier's shared pool. They're first in
the list (and therefore the default pick) on purpose: once there's real
credit on the account, spending a fraction of a cent per call is the actual
fix for "hits the rate limit every time," not a lower per-token price.

The lineup rotates as providers' promotional windows and price lists
change — verify current IDs/pricing at https://openrouter.ai/models and
adjust OPENROUTER_MODELS below if one of these gets pulled or repriced.
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError, RateLimitError, extract_openai_content, parse_retry_after

OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

# Verified live against GET /api/v1/models on 2026-08-21.
#
# gpt-oss-20b and nemotron (both free) are reasoning models: they spend
# completion tokens on an internal "reasoning" field before the final
# answer, and can exhaust max_tokens mid-thought with no visible content at
# all (finish_reason "length", content: null). Fine to offer, but not as
# the default — a plain instruct model behaves predictably at low budgets.
OPENROUTER_MODELS = [
    "mistralai/mistral-nemo",              # paid, ~$0.02+$0.03 per 1M tokens
    "meta-llama/llama-3.1-8b-instruct",    # paid, ~$0.05+$0.08 per 1M tokens
    "google/gemma-4-31b-it:free",
    "z-ai/glm-5.2:free",
    "liquid/lfm-2.5-2.6b:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
]

# A paid model's rate limit isn't OpenRouter's — OpenRouter itself has no
# RPM cap on paid usage. A 429 there is the UPSTREAM backend (whichever
# provider — DeepInfra, etc. — actually serves that model right now) being
# congested, which a paid account can still hit same as anyone else.
# OpenRouter's native `models` fallback array (as opposed to a single
# `model` string) handles this server-side: list a primary + backups and
# it auto-retries the next one on rate-limit/downtime within the SAME
# request — no 429 ever reaches us. Scoped to paid<->paid only: falling
# back from a paid pick to a free one (or vice versa) would silently spend
# a BYOK caller's money on a model they didn't choose.
PAID_MODELS = ["mistralai/mistral-nemo", "meta-llama/llama-3.1-8b-instruct"]


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

        payload = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if model in PAID_MODELS:
            # Primary first, then the other paid model as a same-tier
            # fallback — see PAID_MODELS comment above.
            payload["models"] = [model] + [m for m in PAID_MODELS if m != model]
        else:
            payload["model"] = model

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
                json=payload,
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
