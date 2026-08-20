"""
CONFIG — The nerve center.
Every setting the app needs, typed and validated at startup.
If a required key is missing, the app crashes HERE, not deep in a handler.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # ── Model API keys ──
    groq_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    google_gemini_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None

    # ── Engine defaults ──
    max_iterations: int = Field(default=5, ge=1, le=15)
    convergence_threshold: float = Field(default=0.5, ge=0.0, le=5.0)
    default_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(default=1024, ge=64, le=4096)

    # ── Rate limiting ──
    rate_limit_rpm: int = Field(default=30, description="Requests per minute per provider")

    # ── Storage ──
    database_url: str = "sqlite+aiosqlite:///./judge_loop.db"

    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def get_available_providers(self) -> list[str]:
        """Returns which providers have API keys configured."""
        available = []
        if self.groq_api_key:
            available.append("groq")
        if self.openrouter_api_key:
            available.append("openrouter")
        if self.google_gemini_api_key:
            available.append("gemini")
        if self.huggingface_api_key:
            available.append("huggingface")
        return available


settings = Settings()
