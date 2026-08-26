"""
CONFIG — The nerve center.
Every setting the app needs, typed and validated at startup.
If a required key is missing, the app crashes HERE, not deep in a handler.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── Model API keys ──
    groq_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    google_gemini_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
    # Comma-separated list of extra HF tokens, rotated on 429/401/403 so one
    # exhausted free-tier key doesn't stall a run. Merged with the singular
    # key above via get_huggingface_keys().
    huggingface_api_keys: Optional[str] = None

    # ── Local models (Ollama) ──
    # Off by default — a deployed backend (e.g. Render) can't reach a
    # laptop's localhost, so this only makes sense when the backend itself
    # runs on the same machine as `ollama serve`.
    ollama_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434"

    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    # Set to the deployed frontend's origin (e.g. https://your-site.netlify.app)
    # via env var — kept separate from cors_origins so the dev defaults above
    # don't need editing for a prod deploy.
    frontend_url: Optional[str] = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def get_cors_origins(self) -> list[str]:
        # frontend_url set means this is a real deploy — allow only the real
        # frontend, not the dev defaults too. A deployed backend has no
        # legitimate reason to accept a browser request whose Origin is
        # localhost, and cors_origins' defaults used to be appended
        # unconditionally, so production was quietly trusting localhost:5173
        # (with credentials) right alongside the real site. Local dev
        # (frontend_url unset) keeps the old localhost defaults.
        if self.frontend_url:
            return [self.frontend_url]
        return self.cors_origins

    def get_huggingface_keys(self) -> list[str]:
        """Merge huggingface_api_keys (CSV) and the singular huggingface_api_key
        into one deduped, order-preserving list for HuggingFaceAdapter's rotation."""
        keys: list[str] = []
        if self.huggingface_api_keys:
            keys.extend(k.strip() for k in self.huggingface_api_keys.split(",") if k.strip())
        if self.huggingface_api_key and self.huggingface_api_key not in keys:
            keys.append(self.huggingface_api_key)
        return keys

    def get_available_providers(self) -> list[str]:
        """Returns which providers have API keys configured."""
        available = []
        if self.groq_api_key:
            available.append("groq")
        if self.openrouter_api_key:
            available.append("openrouter")
        if self.google_gemini_api_key:
            available.append("gemini")
        if self.get_huggingface_keys():
            available.append("huggingface")
        if self.ollama_enabled:
            available.append("ollama")
        return available


settings = Settings()
