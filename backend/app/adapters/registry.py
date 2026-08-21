"""
REGISTRY — The switchboard.

Maps provider names to adapter instances. The engine asks for 
"groq" and gets back a GroqAdapter ready to call. Adding a new 
provider = registering it here + writing the adapter file.
"""

from typing import Optional
from .base import ModelAdapter, AdapterError
from .groq_adapter import GroqAdapter, GROQ_MODELS
from .openrouter_adapter import OpenRouterAdapter, OPENROUTER_MODELS
from .gemini_adapter import GeminiAdapter, GEMINI_MODELS
from .ollama_adapter import OllamaAdapter, OLLAMA_MODELS
from ..config import settings


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

    async def generate(
        self,
        provider: str,
        model: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> dict:
        """Convenience: get adapter + call generate in one step."""
        adapter = self.get_adapter(provider)
        return await adapter._timed_generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )


# Global instance — import this, not the class
registry = ModelRegistry()
