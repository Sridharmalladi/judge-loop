"""
REFINEMENT ENGINE — The heart of the system.

This is where it all comes together. The engine:
1. Takes a run configuration
2. Picks the right strategy
3. Loops: generate → evaluate → check convergence → repeat
4. Emits events via callback so the WebSocket can stream to the frontend

The engine doesn't know about HTTP, WebSockets, or databases.
It just runs the loop and calls back when things happen.
This separation matters: you can test the engine without a server.
"""

import logging
from datetime import datetime
from typing import Optional, Callable, Awaitable

from ..models.domain import (
    RefinementRun, Iteration, EvaluationResult,
    ModelConfig, RunStatus,
)
from ..models.schemas import IterationEvent, RunStartedEvent, RunErrorEvent
from ..adapters.registry import registry
from .evaluator import evaluate
from .strategies import get_strategy

logger = logging.getLogger(__name__)

# Type for the event callback — the engine calls this, the API layer handles it
EventCallback = Callable[[dict], Awaitable[None]]


async def run_refinement(
    run: RefinementRun,
    on_event: Optional[EventCallback] = None,
) -> RefinementRun:
    """Execute a complete refinement run.
    
    This is the function you'd point to and say:
    "This is what my system does."
    
    Args:
        run: The run configuration (strategy, models, prompt, limits)
        on_event: Async callback for real-time events (WebSocket streaming)
    
    Returns:
        The completed run with all iterations populated.
    """
    strategy = get_strategy(run.strategy)
    run.status = RunStatus.RUNNING

    # Determine evaluator config
    evaluator_config = strategy.get_evaluator_config(
        run.generator_config, run.evaluator_config
    )

    # Notify: run started
    if on_event:
        await on_event(RunStartedEvent(
            run_id=run.id,
            strategy=run.strategy.value,
            generator=run.generator_config.display_name,
            evaluator=evaluator_config.display_name if run.evaluator_config else None,
            max_iterations=run.max_iterations,
        ).model_dump())

    try:
        for i in range(1, run.max_iterations + 1):
            logger.info(f"Run {run.id}: Starting iteration {i}/{run.max_iterations}")

            # ── STEP 1: Build the prompt ──
            # First iteration: just the original prompt
            # Later: original + feedback from previous iterations
            prompt = strategy.build_generation_prompt(
                original_prompt=run.original_prompt,
                previous_iterations=run.iterations,
            )

            # ── STEP 2: Generate ──
            gen_result = await registry.generate(
                provider=run.generator_config.provider.value,
                model=run.generator_config.model_name,
                prompt=prompt,
                temperature=run.generator_config.temperature,
                max_tokens=run.generator_config.max_tokens,
            )

            # ── STEP 3: Evaluate ──
            evaluation = await evaluate(
                original_prompt=run.original_prompt,
                response=gen_result["content"],
                evaluator_config=evaluator_config,
                criteria=run.evaluation_criteria,
            )

            # ── STEP 4: Record the iteration ──
            iteration = Iteration(
                iteration_number=i,
                response=gen_result["content"],
                evaluation=evaluation,
                prompt_used=prompt,
                model_used=gen_result["model"],
                evaluator_used=evaluator_config.display_name,
                latency_ms=gen_result["latency_ms"],
            )
            run.add_iteration(iteration)

            # ── STEP 5: Emit event ──
            improvement_delta = None
            if len(run.iterations) >= 2:
                improvement_delta = (
                    run.iterations[-1].evaluation.score
                    - run.iterations[-2].evaluation.score
                )

            is_final = (
                i == run.max_iterations
                or run.status in (RunStatus.CONVERGED, RunStatus.FAILED)
            )

            if on_event:
                await on_event(IterationEvent(
                    run_id=run.id,
                    iteration_number=i,
                    response=gen_result["content"],
                    score=evaluation.score,
                    critique=evaluation.critique,
                    strengths=evaluation.strengths,
                    weaknesses=evaluation.weaknesses,
                    suggestions=evaluation.suggestions,
                    improvement_delta=improvement_delta,
                    latency_ms=gen_result["latency_ms"],
                    model_used=gen_result["model"],
                    is_final=is_final,
                    status=run.status.value,
                ).model_dump())

            # ── STEP 6: Check convergence ──
            if run.status == RunStatus.CONVERGED:
                logger.info(
                    f"Run {run.id}: Converged at iteration {i} "
                    f"(delta={improvement_delta:.2f} < threshold={run.convergence_threshold})"
                )
                break

            logger.info(
                f"Run {run.id}: Iteration {i} complete. "
                f"Score: {evaluation.score:.1f}/10"
            )

        # Mark complete if we didn't converge early
        if run.status == RunStatus.RUNNING:
            run.status = RunStatus.COMPLETED
            run.completed_at = datetime.utcnow()

    except Exception as e:
        logger.error(f"Run {run.id} failed: {e}", exc_info=True)
        run.status = RunStatus.FAILED
        run.error_message = str(e)
        run.completed_at = datetime.utcnow()

        if on_event:
            await on_event(RunErrorEvent(
                run_id=run.id,
                error=str(e),
                iteration_number=len(run.iterations),
            ).model_dump())

    return run
