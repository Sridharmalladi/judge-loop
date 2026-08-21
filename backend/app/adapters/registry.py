"""
REGISTRY — The switchboard.

Maps provider names to adapter instances. The engine asks for
"groq" and gets back a GroqAdapter ready to call. Adding a new
provider = registering it here + writing the adapter file.
"""

import asyncio
import logging
from typing import Optional
import httpx
from .base import ModelAdapter, AdapterError, RateLimitError
from .groq_adapter import GroqAdapter, GROQ_MODELS
from .openrouter_adapter import OpenRouterAdapter, OPENROUTER_MODELS
from .gemini_adapter import GeminiAdapter, GEMINI_MODELS
from .huggingface_adapter import HuggingFaceAdapter, HUGGINGFACE_MODELS
from .ollama_adapter import OllamaAdapter, OLLAMA_MODELS
from ..config import settings
from ..engine.reliability import tracker as reliability_tracker

logger = logging.getLogger(__name__)

# BYOK — ad hoc adapter construction from a caller-supplied key, independent
# of whatever the server itself has configured. Ollama has no key (it's a
# local base_url) so it isn't a BYOK candidate.
BYOK_ADAPTER_FACTORY = {
    "groq": GroqAdapter,
    "openrouter": OpenRouterAdapter,
    "gemini": GeminiAdapter,
    "huggingface": lambda key: HuggingFaceAdapter([key]),
}

# Full static catalog for every provider that COULD be used, regardless of
# whether the server has a key for it — BYOK users pick from this, not from
# get_available_models() (which only lists what the server itself can call).
FULL_MODEL_CATALOG: dict[str, list[str]] = {
    "groq": GROQ_MODELS,
    "openrouter": OPENROUTER_MODELS,
    "gemini": GEMINI_MODELS,
    "huggingface": HUGGINGFACE_MODELS,
}

# A provider's own outage ("high demand", 502/503/504 from an upstream
# load balancer) is usually gone within a couple seconds — worth one or
# two quick retries before failing the whole run over it. Rate limits
# (429) only get retried if the provider says the wait is short; a
# 60s retry_after would just block the round for no benefit — HF's key
# rotation already sidesteps that case where multiple keys exist.
TRANSIENT_STATUS_CODES = {500, 502, 503, 504}
MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = [0.5, 1.5]
MAX_RATE_LIMIT_WAIT_SECONDS = 5.0


class ModelRegistry:
    """Singleton-ish registry of available model adapters."""

    def __init__(self):
        self._adapters: dict[str, ModelAdapter] = {}
        self._model_catalog: dict[str, list[str]] = {}
        self._initialize()

    def _initialize(self):
        """Wire up adapters based on which API keys are configured."""
        if settings.groq_api_key:
            self._adapters["groq"] = GroqAdapter(settings.groq_api_key)
            self._model_catalog["groq"] = GROQ_MODELS

        if settings.openrouter_api_key:
            self._adapters["openrouter"] = OpenRouterAdapter(settings.openrouter_api_key)
            self._model_catalog["openrouter"] = OPENROUTER_MODELS

        if settings.google_gemini_api_key:
            self._adapters["gemini"] = GeminiAdapter(settings.google_gemini_api_key)
            self._model_catalog["gemini"] = GEMINI_MODELS

        hf_keys = settings.get_huggingface_keys()
        if hf_keys:
            self._adapters["huggingface"] = HuggingFaceAdapter(hf_keys)
            self._model_catalog["huggingface"] = HUGGINGFACE_MODELS

        if settings.ollama_enabled:
            self._adapters["ollama"] = OllamaAdapter(settings.ollama_base_url)
            self._model_catalog["ollama"] = OLLAMA_MODELS  # refreshed live in routes.list_models

    def get_adapter(self, provider: str) -> ModelAdapter:
        """Get the adapter for a provider. Raises if not configured."""
        adapter = self._adapters.get(provider)
        if not adapter:
            available = list(self._adapters.keys())
            raise AdapterError(
                provider,
                f"Provider '{provider}' not configured. Available: {available}"
            )
        return adapter

    def get_available_models(self) -> dict[str, list[str]]:
        """Returns {provider: [model_names]} for all configured providers."""
        return self._model_catalog.copy()

    def get_available_providers(self) -> list[str]:
        return list(self._adapters.keys())

    def get_byok_adapter(self, provider: str, api_key: str) -> ModelAdapter:
        """Build a one-off adapter from a caller-supplied key. Never cached,
        never touches self._adapters — it's used for exactly one generate()
        call and then garbage collected."""
        factory = BYOK_ADAPTER_FACTORY.get(provider)
        if not factory:
            raise AdapterError(provider, f"'{provider}' doesn't support bring-your-own-key")
        return factory(api_key)

    async def generate(
        self,
        provider: str,
        model: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        api_key: Optional[str] = None,
    ) -> dict:
        """Convenience: get adapter + call generate in one step.

        Retries transient failures (provider 5xx, network blips, short rate
        limits) in place before giving up — see the module docstring above
        for why each case is or isn't worth retrying.

        api_key (BYOK): when given, calls run against a one-off adapter for
        the caller's own key instead of the server's configured one, and
        results aren't fed into the shared reliability ranking — that
        ranking describes the server's own keys' health, not a visitor's.
        """
        is_byok = api_key is not None
        adapter = self.get_byok_adapter(provider, api_key) if is_byok else self.get_adapter(provider)
        last_error: Exception = AdapterError(provider, "generate() never attempted")

        for attempt in range(MAX_ATTEMPTS):
            try:
                result = await adapter._timed_generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if not is_byok:
                    reliability_tracker.record_success(provider, model)
                return result

            except RateLimitError as e:
                last_error = e
                retryable = attempt < MAX_ATTEMPTS - 1 and e.retry_after and e.retry_after <= MAX_RATE_LIMIT_WAIT_SECONDS
                if not retryable:
                    break
                logger.info(f"[{provider}/{model}] rate limited, retrying in {e.retry_after}s (attempt {attempt + 1}/{MAX_ATTEMPTS})")
                await asyncio.sleep(e.retry_after)

            except AdapterError as e:
                last_error = e
                retryable = attempt < MAX_ATTEMPTS - 1 and e.status_code in TRANSIENT_STATUS_CODES
                if not retryable:
                    break
                delay = RETRY_BACKOFF_SECONDS[attempt]
                logger.info(f"[{provider}/{model}] transient HTTP {e.status_code}, retrying in {delay}s (attempt {attempt + 1}/{MAX_ATTEMPTS})")
                await asyncio.sleep(delay)

            except httpx.RequestError as e:
                last_error = e
                if attempt >= MAX_ATTEMPTS - 1:
                    break
                delay = RETRY_BACKOFF_SECONDS[attempt]
                logger.info(f"[{provider}/{model}] network error ({e}), retrying in {delay}s (attempt {attempt + 1}/{MAX_ATTEMPTS})")
                await asyncio.sleep(delay)

        if not is_byok:
            reliability_tracker.record_failure(provider, model)
        raise last_error


# Global instance — import this, not the class
registry = ModelRegistry()
