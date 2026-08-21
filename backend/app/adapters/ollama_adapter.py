"""
OLLAMA ADAPTER — Local models, no API key, no rate limit.

Talks to a locally-running `ollama serve` (default http://localhost:11434).
Whatever's rate-limiting you on Groq/OpenRouter doesn't apply here — the
only ceiling is your own machine's hardware.

Requires Ollama installed and running, with at least one model pulled:
    ollama pull llama3.2
    ollama pull qwen2.5:3b
"""

import httpx
from typing import Optional
from .base import ModelAdapter, AdapterError

# Fallback suggestions shown if the live /api/tags query fails (daemon not
# running, wrong port) — not a hard model list, just something to pull.
OLLAMA_MODELS = ["llama3.2", "qwen2.5:3b", "phi3.5", "gemma2:2b"]


class OllamaAdapter(ModelAdapter):

    def __init__(self, base_url: str):
        # No API key for a local daemon — base class wants one, so pass a
        # placeholder that's never actually sent anywhere.
        super().__init__(api_key="local")
        self.base_url = base_url.rstrip("/")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                        },
                    },
                )
        except httpx.ConnectError:
            raise AdapterError(
                "ollama",
                f"Could not reach Ollama at {self.base_url} — is `ollama serve` running?",
            )

        if response.status_code == 404:
            raise AdapterError(
                "ollama",
                f"Model '{model}' not found locally. Pull it first: ollama pull {model}",
                404,
            )

        if response.status_code != 200:
            raise AdapterError("ollama", f"HTTP {response.status_code}: {response.text}", response.status_code)

        data = response.json()
        try:
            content = data["message"]["content"]
        except (KeyError, TypeError):
            raise AdapterError("ollama", f"Unexpected response format: {data}")

        return {
            "content": content,
            "model": data.get("model", model),
            "tokens_used": data.get("eval_count", 0) + data.get("prompt_eval_count", 0),
            "latency_ms": 0,  # Filled by _timed_generate
        }

    async def list_models(self) -> list[str]:
        """Live-query whatever the user has actually pulled — a static
        catalog would be wrong for almost everyone, since it's entirely
        local to their machine."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            names = [m["name"] for m in response.json().get("models", [])]
            return names or OLLAMA_MODELS
        except (httpx.HTTPError, KeyError, ValueError):
            return OLLAMA_MODELS
