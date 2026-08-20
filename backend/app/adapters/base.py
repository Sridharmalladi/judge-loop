"""
BASE ADAPTER — The contract every model provider signs.

This is the Adapter Pattern: we define ONE interface, and each provider 
(Groq, OpenRouter, Gemini) implements it differently behind the scenes.
The engine doesn't know or care which provider it's talking to.

WHY THIS MATTERS:
Adding a new provider = writing ONE file that inherits this class.
No changes to the engine, no changes to the API, no changes to the frontend.
"""

from abc import ABC, abstractmethod
from typing import Optional
import time
import logging

logger = logging.getLogger(__name__)


class ModelAdapter(ABC):
    """Abstract base for all LLM provider adapters.
    
    Every adapter must implement:
    - generate(): send a prompt, get a response
    - list_models(): return available model names
    - health_check(): verify the API key works
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._request_count = 0
        self._last_request_time: Optional[float] = None

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        """Send a prompt and get a response.
        
        Returns:
            {
                "content": str,        # The model's response text
                "model": str,          # Actual model used
                "latency_ms": float,   # Round-trip time
                "tokens_used": int,    # Total tokens consumed
            }
        """
        ...

    @abstractmethod
    async def list_models(self) -> list[str]:
        """Return model names available on this provider."""
        ...

    async def health_check(self) -> bool:
        """Verify the API key works. Default: try listing models."""
        try:
            models = await self.list_models()
            return len(models) > 0
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            return False

    async def _timed_generate(
        self,
        prompt: str,
        system_prompt: Optional[str],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> dict:
        """Wrapper that adds timing to any generate call."""
        start = time.perf_counter()
        try:
            result = await self.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            elapsed = (time.perf_counter() - start) * 1000
            result["latency_ms"] = elapsed
            self._request_count += 1
            self._last_request_time = time.time()
            return result
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            logger.error(f"Generate failed after {elapsed:.0f}ms: {e}")
            raise


def parse_retry_after(value: Optional[str], default: float = 60.0) -> float:
    """Retry-After can be delta-seconds ('60') or an HTTP-date
    ('Wed, 21 Oct 2026 07:28:00 GMT') per RFC 9110 — float() only handles
    the first form. Fall back to `default` rather than raising on the
    second, since retry timing is advisory, not worth crashing the run for.
    """
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def extract_openai_content(data: dict, provider: str, model: str) -> tuple[str, str]:
    """Pull (content, model) out of an OpenAI-compatible chat completion,
    shared by every adapter that speaks that format (Groq, OpenRouter).

    Reasoning models (gpt-oss-*, nemotron-*) can exhaust max_tokens on
    internal "reasoning" and return content: null with the partial thought
    under "reasoning" instead — fall back to that only when content is
    genuinely absent, not when it's a legitimate empty string.
    """
    try:
        message = data["choices"][0]["message"]
    except (KeyError, IndexError):
        raise AdapterError(provider, f"Unexpected response format: {data}")

    content = message.get("content")
    if content is None:
        content = message.get("reasoning") or ""
    return content, data.get("model", model)


class AdapterError(Exception):
    """Raised when a model adapter encounters an unrecoverable error."""
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"[{provider}] {message}")


class RateLimitError(AdapterError):
    """Raised when a provider's rate limit is hit."""
    def __init__(self, provider: str, retry_after: Optional[float] = None):
        self.retry_after = retry_after
        super().__init__(provider, f"Rate limited. Retry after {retry_after}s", 429)
