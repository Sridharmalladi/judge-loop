"""
WEBSOCKET — Real-time streaming.

The REST endpoint runs the full loop and returns the result.
The WebSocket endpoint streams each iteration AS IT HAPPENS.

This is what makes the frontend feel alive — the user watches
the score climb in real time instead of waiting for a spinner.

Flow:
1. Client connects to ws://host/ws/refine
2. Client sends StartRunRequest as JSON
3. Server streams IterationEvent for each cycle
4. Server sends final event with is_final=True
5. Connection stays open for another run or client disconnects
"""

import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
from ..models.schemas import StartRunRequest
from ..models.domain import (
    RefinementRun, ModelConfig, EvaluationCriteria,
)
from ..engine.refinement import run_refinement
from ..storage.runs import run_store

logger = logging.getLogger(__name__)


async def websocket_refine(websocket: WebSocket):
    """Handle a WebSocket refinement session."""
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            # Wait for client to send a run request
            raw = await websocket.receive_text()
            data = json.loads(raw)

            try:
                req = StartRunRequest(**data)
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "error": f"Invalid request: {e}",
                })
                continue

            # Build the run
            generator_config = ModelConfig(
                provider=req.generator_provider,
                model_name=req.generator_model,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
            )
            evaluator_config = None
            if req.evaluator_provider and req.evaluator_model:
                evaluator_config = ModelConfig(
                    provider=req.evaluator_provider,
                    model_name=req.evaluator_model,
                    temperature=0.3,
                )

            run = RefinementRun(
                strategy=req.strategy,
                original_prompt=req.prompt,
                generator_config=generator_config,
                evaluator_config=evaluator_config,
                evaluation_criteria=EvaluationCriteria(
                    custom_criteria=req.custom_criteria
                ),
                max_iterations=req.max_iterations,
                convergence_threshold=req.convergence_threshold,
            )

            # The callback — this is what streams events to the frontend
            async def send_event(event: dict):
                if "error" in event:
                    event["type"] = "error"
                elif "iteration_number" in event:
                    event["type"] = "iteration"
                else:
                    event["type"] = "status"
                await websocket.send_json(event)

            # Run the loop (events stream as they happen)
            completed = await run_refinement(run, on_event=send_event)

            # Persist the completed run
            await run_store.save_run(completed)

            # Send final summary
            await websocket.send_json({
                "type": "complete",
                "run_id": completed.id,
                "final_score": completed.current_score,
                "initial_score": completed.initial_score,
                "total_improvement": completed.total_improvement,
                "iteration_count": len(completed.iterations),
                "status": completed.status.value,
            })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
            })
        except Exception:
            pass
