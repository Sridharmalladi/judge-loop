# Lesson 01 — Data model

## Why this lesson exists

The data model is the spine of any application. Get it right, and the backend writes itself — every function knows what it receives and returns. Get it wrong, and you'll spend more time fixing type mismatches than building features.

We define EVERY type the system uses before writing a single endpoint or UI component. This is what separates "I can code" from "I can engineer."

## Concepts to understand first

> **Claude Code:** Quiz me on these before we start coding.

### 1. Domain modeling
We're translating a real-world process (LLM refinement) into data structures. The key question is: **what are the nouns in this system?**
- A **refinement run** — one complete execution of the loop
- An **iteration** — one generate→evaluate→refine cycle within a run
- A **model config** — which model to use and how
- An **evaluation result** — scores and critique from a single evaluation
- A **strategy** — which mode (self-refine, cross-model, prompt-opt)

**Review question:** What's the difference between a "run" and an "iteration"? Give a concrete example with numbers.

### 2. Pydantic models vs. dataclasses
We use Pydantic because:
- It validates data at creation time (not at use time)
- It serializes to JSON natively (our API needs this)
- It generates OpenAPI schemas automatically (FastAPI uses this)

**Review question:** What happens if you try to create a Pydantic model with `score="not_a_number"` when the field is typed as `float`? What would happen with a plain dataclass?

### 3. Request models vs. response models vs. domain models
These are NOT the same thing:
- **Request model** — what the client sends (minimal, validated)
- **Domain model** — what the engine operates on internally (rich, complete)
- **Response model** — what the client receives (curated, safe)

A request has no `id` or `created_at` — the server assigns those. A response might exclude internal fields. Conflating these is a common junior mistake.

---

## Build steps

> **Claude Code:** For each model, explain the design decision. Ask me to write the first one myself, review it, then we build the rest together.

### Step 1: Domain models (backend/app/models/domain.py)

These are the core types the engine uses internally:

```python
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
import uuid

class RefinementStrategy(str, Enum):
    """The three modes — this drives the strategy pattern in the engine."""
    SELF_REFINE = "self_refine"
    CROSS_MODEL = "cross_model"
    PROMPT_OPTIMIZATION = "prompt_optimization"

class ModelProvider(str, Enum):
    """Supported providers — maps to adapter classes."""
    GROQ = "groq"
    OPENROUTER = "openrouter"
    GEMINI = "gemini"
    HUGGINGFACE = "huggingface"

class ModelConfig(BaseModel):
    """Everything needed to call a specific model."""
    provider: ModelProvider
    model_name: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=4096)

class EvaluationResult(BaseModel):
    """Output of the LLM-as-Judge evaluation step."""
    score: float = Field(ge=0.0, le=10.0)
    critique: str
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

class Iteration(BaseModel):
    """One cycle of generate → evaluate → refine."""
    iteration_number: int
    response: str
    evaluation: EvaluationResult
    prompt_used: str  # The actual prompt sent (includes prior feedback)
    model_used: str
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RefinementRun(BaseModel):
    """A complete refinement execution."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy: RefinementStrategy
    original_prompt: str
    generator_config: ModelConfig
    evaluator_config: Optional[ModelConfig] = None  # None = same as generator (self-refine)
    iterations: list[Iteration] = []
    status: str = "pending"  # pending, running, completed, failed
    max_iterations: int = 5
    convergence_threshold: float = 0.5  # Stop if improvement < this
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
```

**Stop and review:** Before continuing, ask yourself:
- Why is `evaluator_config` optional? When is it None?
- Why does `Iteration` store `prompt_used`? Why not just the response?
- What does `convergence_threshold` do? How would the engine use it?

### Step 2: Request/response schemas (backend/app/models/schemas.py)

```python
from pydantic import BaseModel, Field
from typing import Optional
from .domain import RefinementStrategy, ModelProvider

class StartRunRequest(BaseModel):
    """What the client sends to kick off a refinement run."""
    prompt: str = Field(min_length=1, max_length=5000)
    strategy: RefinementStrategy
    generator_provider: ModelProvider
    generator_model: str
    evaluator_provider: Optional[ModelProvider] = None
    evaluator_model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_iterations: int = Field(default=5, ge=1, le=10)

class IterationEvent(BaseModel):
    """Sent via WebSocket as each iteration completes."""
    iteration_number: int
    response: str
    score: float
    critique: str
    strengths: list[str]
    weaknesses: list[str]
    improvement_delta: Optional[float] = None  # score - previous score
    is_final: bool = False

class RunSummary(BaseModel):
    """Returned when listing past runs."""
    id: str
    strategy: str
    prompt_preview: str  # First 100 chars
    model: str
    final_score: Optional[float]
    iteration_count: int
    created_at: str
```

**Review question:** Compare `StartRunRequest` to `RefinementRun`. What fields does the server add that the client never sends? Why?

---

## Review checkpoint

> **Claude Code:** Ask me these. I need to answer all correctly.

1. Draw (on paper or explain verbally) the relationship between `RefinementRun`, `Iteration`, and `EvaluationResult`. Which contains which?
2. Why is `EvaluationResult.score` bounded to 0-10 using `Field(ge=0.0, le=10.0)` instead of just `float`? What happens if the LLM-as-Judge returns 15?
3. In the `StartRunRequest`, why are `evaluator_provider` and `evaluator_model` optional? What strategy are they required for?
4. Why do we have BOTH `domain.py` and `schemas.py`? Give a concrete example where having the same model for both would cause a problem.
5. Look at `IterationEvent.improvement_delta`. Why is the first iteration's delta `None`?

---

## Challenge

**Write these yourself before looking at solutions:**

1. Add a `RunComparisonRequest` schema for when the user wants to compare two runs side by side. Think about what fields it needs.
2. Add a `PromptTemplate` domain model for the prompt optimization mode. It needs to store the template string, version number, and its aggregate score across test cases.
3. Add validation to `StartRunRequest` using a Pydantic `model_validator` that ensures `evaluator_provider` is provided when `strategy` is `CROSS_MODEL`.

> **Claude Code:** After I attempt each challenge, review my code. Point out what I missed but don't rewrite it — let me fix it.
