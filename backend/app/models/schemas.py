"""
SCHEMAS — The API contract.
What clients send (requests) and receive (responses).
Separate from domain models because the API surface != internal state.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional
from .domain import RefinementStrategy, ModelProvider


# ── Requests ──

class StartRunRequest(BaseModel):
    """Client sends this to kick off a refinement run."""
    prompt: str = Field(min_length=1, max_length=5000)
    strategy: RefinementStrategy
    generator_provider: ModelProvider
    generator_model: str
    evaluator_provider: Optional[ModelProvider] = None
    evaluator_model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=64, le=4096)
    max_iterations: int = Field(default=5, ge=1, le=10)
    convergence_threshold: float = Field(default=0.5, ge=0.0, le=5.0)
    custom_criteria: Optional[str] = None

    @model_validator(mode="after")
    def validate_cross_model(self):
        """Cross-model mode REQUIRES a separate evaluator."""
        if self.strategy == RefinementStrategy.CROSS_MODEL:
            if not self.evaluator_provider or not self.evaluator_model:
                raise ValueError(
                    "Cross-model strategy requires evaluator_provider and evaluator_model"
                )
        return self


class CompareRunsRequest(BaseModel):
    """Compare two or more past runs side by side."""
    run_ids: list[str] = Field(min_length=2, max_length=5)


# ── WebSocket events (server → client) ──

class IterationEvent(BaseModel):
    """Pushed via WebSocket as each iteration completes."""
    run_id: str
    iteration_number: int
    response: str
    score: float
    critique: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    dimension_scores: dict[str, float] = {}
    improvement_delta: Optional[float] = None
    latency_ms: float
    model_used: str
    is_final: bool = False
    status: str = "running"  # running, completed, converged, failed


class RunStartedEvent(BaseModel):
    """Sent once when the run begins."""
    run_id: str
    strategy: str
    generator: str
    evaluator: Optional[str] = None
    max_iterations: int


class RunErrorEvent(BaseModel):
    """Sent if something breaks mid-run."""
    run_id: str
    error: str
    iteration_number: Optional[int] = None


# ── REST responses ──

class RunSummary(BaseModel):
    """Lightweight summary for listing past runs."""
    id: str
    strategy: str
    prompt_preview: str
    generator: str
    evaluator: Optional[str] = None
    final_score: Optional[float] = None
    initial_score: Optional[float] = None
    total_improvement: Optional[float] = None
    iteration_count: int
    status: str
    created_at: str


class RunDetail(BaseModel):
    """Full run data for the detail view."""
    id: str
    strategy: str
    original_prompt: str
    generator: str
    evaluator: Optional[str] = None
    status: str
    iterations: list[IterationEvent]
    score_history: list[float]
    created_at: str
    completed_at: Optional[str] = None


class AvailableModelsResponse(BaseModel):
    """What models the user can pick from (based on configured API keys)."""
    providers: list[str]
    models: dict[str, list[str]]  # provider → [model_names]
