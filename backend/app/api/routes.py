"""
API ROUTES — The REST interface.

Thin layer: validates input, calls the engine, formats output.
No business logic lives here — if you're writing an if/else about
refinement behavior in a route handler, it belongs in the engine.
"""

from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    StartRunRequest, RunSummary, RunDetail,
    AvailableModelsResponse, IterationEvent,
)
from ..models.domain import (
    RefinementRun, ModelConfig, EvaluationCriteria, RunStatus,
)
from ..adapters.registry import registry, FULL_MODEL_CATALOG
from ..engine.refinement import run_refinement
from ..engine.reliability import tracker as reliability_tracker
from ..storage.runs import run_store

router = APIRouter(prefix="/api", tags=["refinement"])

# Known-good right now (funded, real credit backing it) — gets the 🔥 badge
# and sorts first immediately, rather than waiting for enough call history
# to prove itself. Any other provider earns the same badge dynamically once
# reliability_tracker.provider_score sees enough real traffic.
FEATURED_PROVIDERS = {"openrouter"}


@router.get("/models", response_model=AvailableModelsResponse)
async def list_models():
    """What models can the user pick from, using the SERVER's own keys."""
    models = registry.get_available_models()
    if "ollama" in models:
        # Static providers ship a fixed catalog — Ollama's is whatever the
        # user has pulled locally, so refresh it live instead of trusting
        # the placeholder set at registry init.
        models["ollama"] = await registry.get_adapter("ollama").list_models()

    # Most-reliable-first within each provider's list, so a model that's
    # been erroring or rate-limited sinks to the bottom instead of sitting
    # as the pre-selected default.
    models = {provider: reliability_tracker.sort_models(provider, ms) for provider, ms in models.items()}

    providers = registry.get_available_providers()
    featured = [
        p for p in providers
        if p in FEATURED_PROVIDERS or reliability_tracker.provider_score(p, models.get(p, [])) >= 0.75
    ]
    # Featured providers first; stable sort preserves relative order otherwise.
    providers = sorted(providers, key=lambda p: p not in featured)

    return AvailableModelsResponse(
        providers=providers,
        models=models,
        featured=featured,
    )


@router.get("/models/catalog", response_model=AvailableModelsResponse)
async def model_catalog():
    """Every provider that CAN be used with a bring-your-own-key, regardless
    of whether the server itself has a key configured for it. Powers the
    BYOK picker — the dynamic proven-reliability signal doesn't apply since
    it's the caller's own key, not the server's, but the hardcoded
    known-good set still does (the service itself is reliable regardless
    of whose key is calling it).
    """
    providers = sorted(FULL_MODEL_CATALOG.keys(), key=lambda p: p not in FEATURED_PROVIDERS)
    return AvailableModelsResponse(
        providers=providers,
        models=FULL_MODEL_CATALOG,
        featured=[p for p in providers if p in FEATURED_PROVIDERS],
    )


@router.post("/runs", response_model=RunDetail)
async def start_run(req: StartRunRequest):
    """Start a refinement run (synchronous — use WebSocket for streaming)."""
    generator_config = ModelConfig(
        provider=req.generator_provider,
        model_name=req.generator_model,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        api_key=req.generator_api_key,
    )

    evaluator_config = None
    if req.evaluator_provider and req.evaluator_model:
        evaluator_config = ModelConfig(
            provider=req.evaluator_provider,
            model_name=req.evaluator_model,
            temperature=0.3,  # Low temp for consistent judging
            api_key=req.evaluator_api_key,
        )

    criteria = EvaluationCriteria(
        custom_criteria=req.custom_criteria
    )

    run = RefinementRun(
        strategy=req.strategy,
        original_prompt=req.prompt,
        generator_config=generator_config,
        evaluator_config=evaluator_config,
        evaluation_criteria=criteria,
        max_iterations=req.max_iterations,
        convergence_threshold=req.convergence_threshold,
    )

    # Execute the refinement loop
    completed_run = await run_refinement(run)

    # Persist
    await run_store.save_run(completed_run)

    return _run_to_detail(completed_run)


@router.get("/runs", response_model=list[RunSummary])
async def list_runs(limit: int = 20, offset: int = 0):
    """List past runs, newest first."""
    runs = await run_store.list_runs(limit=limit, offset=offset)
    return [_run_to_summary(r) for r in runs]


@router.get("/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: str):
    """Get full details of a specific run."""
    run = await run_store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return _run_to_detail(run)


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    """Delete a past run."""
    deleted = await run_store.delete_run(run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return {"deleted": True}


# ── Response builders ──

def _run_to_summary(run: RefinementRun) -> RunSummary:
    return RunSummary(
        id=run.id,
        strategy=run.strategy.value,
        prompt_preview=run.original_prompt[:100],
        generator=run.generator_config.display_name,
        evaluator=run.evaluator_config.display_name if run.evaluator_config else None,
        final_score=run.current_score,
        initial_score=run.initial_score,
        total_improvement=run.total_improvement,
        iteration_count=len(run.iterations),
        status=run.status.value,
        created_at=run.created_at.isoformat(),
    )


def _run_to_detail(run: RefinementRun) -> RunDetail:
    iteration_events = []
    for idx, it in enumerate(run.iterations):
        delta = None
        if idx > 0:
            delta = it.evaluation.score - run.iterations[idx - 1].evaluation.score
        iteration_events.append(IterationEvent(
            run_id=run.id,
            iteration_number=it.iteration_number,
            response=it.response,
            score=it.evaluation.score,
            critique=it.evaluation.critique,
            strengths=it.evaluation.strengths,
            weaknesses=it.evaluation.weaknesses,
            suggestions=it.evaluation.suggestions,
            dimension_scores=it.evaluation.dimension_scores,
            improvement_delta=delta,
            latency_ms=it.latency_ms,
            model_used=it.model_used,
            is_final=(idx == len(run.iterations) - 1),
            status=run.status.value,
        ))

    return RunDetail(
        id=run.id,
        strategy=run.strategy.value,
        original_prompt=run.original_prompt,
        generator=run.generator_config.display_name,
        evaluator=run.evaluator_config.display_name if run.evaluator_config else None,
        status=run.status.value,
        iterations=iteration_events,
        score_history=run.score_history,
        created_at=run.created_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
    )
