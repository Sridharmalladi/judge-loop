"""
DOMAIN MODELS — The nouns of the system.
Everything the engine thinks about is defined here.
No API concerns, no serialization tricks — pure domain logic.
"""

from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
import uuid


# ── Enums (the "what kind" questions) ──

class RefinementStrategy(str, Enum):
    """Three modes — each one changes WHO generates and WHO evaluates."""
    SELF_REFINE = "self_refine"              # Same model does both
    CROSS_MODEL = "cross_model"              # Model A generates, Model B judges
    PROMPT_OPTIMIZATION = "prompt_optimization"  # Prompt template evolves across test cases


class ModelProvider(str, Enum):
    """Maps to adapter classes in adapters/. Adding a provider = adding one file."""
    GROQ = "groq"
    TOGETHER = "together"
    GEMINI = "gemini"
    HUGGINGFACE = "huggingface"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CONVERGED = "converged"  # Stopped early because improvement plateaued


# ── Value objects (small, immutable pieces of data) ──

class ModelConfig(BaseModel):
    """Everything needed to call a specific model. 
    Think of this as the "address + instructions" for one LLM."""
    provider: ModelProvider
    model_name: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=4096)

    @property
    def display_name(self) -> str:
        return f"{self.provider.value}/{self.model_name}"


class EvaluationResult(BaseModel):
    """Output of the LLM-as-Judge step.
    
    The score is 0-10. The critique is structured so the refine step
    can use it as actionable feedback, not just "try harder."
    """
    score: float = Field(ge=0.0, le=10.0)
    critique: str
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []
    raw_judge_response: str = ""  # Full judge output for debugging


class EvaluationCriteria(BaseModel):
    """What the judge evaluates against.
    Users can customize this or use defaults."""
    accuracy: float = Field(default=1.0, description="Weight for factual correctness")
    completeness: float = Field(default=1.0, description="Weight for thoroughness")
    clarity: float = Field(default=1.0, description="Weight for readability")
    relevance: float = Field(default=1.0, description="Weight for staying on-topic")
    custom_criteria: Optional[str] = None  # Free-text additional criteria


# ── Entity objects (have identity, change over time) ──

class Iteration(BaseModel):
    """One cycle of generate → evaluate.
    
    Stores everything needed to replay or compare:
    - What prompt was sent (includes prior feedback)
    - What the model responded
    - How the judge scored it
    - How long it took
    """
    iteration_number: int
    response: str
    evaluation: EvaluationResult
    prompt_used: str
    model_used: str
    evaluator_used: str
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @property
    def improved_over(self) -> Optional[float]:
        """Can only be computed when compared to previous iteration."""
        return None  # Computed by the run, not the iteration


class RefinementRun(BaseModel):
    """A complete refinement execution — the top-level entity.
    
    Contains everything: config, iterations, results.
    One run = one experiment a user can point to and say 
    "look how the model improved from 4.2 to 8.1."
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy: RefinementStrategy
    original_prompt: str
    generator_config: ModelConfig
    evaluator_config: Optional[ModelConfig] = None  # None → self-refine (same model)
    evaluation_criteria: EvaluationCriteria = Field(default_factory=EvaluationCriteria)
    iterations: list[Iteration] = []
    status: RunStatus = RunStatus.PENDING
    max_iterations: int = Field(default=5, ge=1, le=15)
    convergence_threshold: float = Field(default=0.5, ge=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    # ── Computed properties ──

    @property
    def current_score(self) -> Optional[float]:
        if not self.iterations:
            return None
        return self.iterations[-1].evaluation.score

    @property
    def initial_score(self) -> Optional[float]:
        if not self.iterations:
            return None
        return self.iterations[0].evaluation.score

    @property
    def total_improvement(self) -> Optional[float]:
        if len(self.iterations) < 2:
            return None
        return self.current_score - self.initial_score

    @property
    def score_history(self) -> list[float]:
        return [it.evaluation.score for it in self.iterations]

    def has_converged(self) -> bool:
        """Check if the last improvement was below the threshold."""
        if len(self.iterations) < 2:
            return False
        delta = abs(
            self.iterations[-1].evaluation.score
            - self.iterations[-2].evaluation.score
        )
        return delta < self.convergence_threshold

    def add_iteration(self, iteration: Iteration) -> None:
        self.iterations.append(iteration)
        if self.has_converged():
            self.status = RunStatus.CONVERGED
            self.completed_at = datetime.utcnow()


# ── Prompt optimization specific ──

class PromptTemplate(BaseModel):
    """For prompt optimization mode — the template that evolves."""
    version: int
    template: str
    avg_score: Optional[float] = None
    test_scores: list[float] = []
    parent_version: Optional[int] = None  # Which version this evolved from
