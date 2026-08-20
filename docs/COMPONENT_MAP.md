# Backend component map

Every file, what it does, what it connects to, and what to look for when reading it.

## How to read this with Claude Code

Open the project in Claude Code and say:

```
Read docs/COMPONENT_MAP.md. Then walk me through the codebase 
file by file starting from main.py. For each file, show me the 
code, explain the key decisions, and quiz me before moving on.
```

---

## app/main.py — Entry point
**Does:** Wires FastAPI app, CORS, routes, WebSocket endpoint, health check.
**Connects to:** config.py, api/routes.py, api/websocket.py
**Design rule:** This file should be boring. If there's logic here, it's in the wrong place.
**Look for:** How CORS origins come from config, not hardcoded.

## app/config.py — Settings
**Does:** Loads .env into typed Pydantic Settings. Validates at startup.
**Connects to:** Everything (imported everywhere for API keys, defaults)
**Design rule:** Crash early. If a critical setting is missing, fail at import time, not at request time.
**Look for:** `get_available_providers()` — only returns providers with configured keys.

---

## app/models/domain.py — Core types
**Does:** Defines every noun: RefinementRun, Iteration, EvaluationResult, ModelConfig, etc.
**Connects to:** Used by engine/, api/, storage/
**Design rule:** No API concerns. No serialization tricks. Pure domain.
**Look for:**
- `RefinementRun.has_converged()` — the convergence detection logic
- `RefinementRun.add_iteration()` — auto-triggers convergence check
- `ModelConfig.display_name` — computed property for human-readable model ID
- `EvaluationCriteria` — weights the judge uses (user-customizable)

## app/models/schemas.py — API contract
**Does:** Defines what clients send (requests) and receive (responses). Separate from domain.
**Connects to:** api/routes.py, api/websocket.py
**Design rule:** Request != Domain != Response. The client never sees internal fields.
**Look for:**
- `StartRunRequest.validate_cross_model()` — Pydantic model_validator that enforces business rules
- `IterationEvent` — the WebSocket payload shape
- Request has no `id` or `created_at` — server assigns those

---

## app/adapters/base.py — Abstract adapter
**Does:** Defines the interface every model provider must implement.
**Connects to:** All concrete adapters inherit from this.
**Design rule:** Adapter Pattern. The engine calls `generate()` without knowing which provider.
**Look for:**
- `_timed_generate()` — wraps any generate call with timing + request counting
- `AdapterError` and `RateLimitError` — typed exceptions the engine can catch specifically
- Adding a new provider = writing ONE file that inherits this class

## app/adapters/groq_adapter.py — Groq
**Does:** Talks to Groq's OpenAI-compatible API. Llama, Mixtral, Gemma.
**Connects to:** base.py (inherits), registry.py (registered)
**Look for:** How rate limit errors are detected via HTTP 429 + retry-after header.

## app/adapters/openrouter_adapter.py — OpenRouter
**Does:** Same shape as Groq — OpenAI-compatible. Proxies to many providers' free-tier (":free"-suffixed) models — DeepSeek R1, Llama 3.3, Gemini Flash, Qwen — through one key.
**Look for:** Same interface, different models. That's the adapter pattern working.

## app/adapters/gemini_adapter.py — Google Gemini
**Does:** Talks to Google's Generative AI API — DIFFERENT format from OpenAI.
**Look for:** The request body structure is completely different (contents/parts vs messages). The adapter hides this from the engine. THIS is why the pattern exists.

## app/adapters/registry.py — Model registry
**Does:** Central switchboard. Maps provider names to adapter instances.
**Connects to:** All adapters, config.py (for API keys)
**Design rule:** Engine asks for "groq", gets back a ready adapter. No if/else chains.
**Look for:**
- `_initialize()` — only registers providers with configured API keys
- `generate()` — convenience method: get adapter + call in one step
- Global `registry` instance — import this, not the class

---

## app/engine/evaluator.py — LLM-as-Judge
**Does:** The most critical component. Uses an LLM to score another LLM's output.
**Connects to:** registry (to call the judge model), domain models
**Design rule:** The judge prompt IS the system. Bad prompt = useless scores = wasted iterations.
**Look for:**
- `JUDGE_SYSTEM_PROMPT` — structured rubric with scoring guide
- `_parse_judge_response()` — THREE fallback strategies for extracting JSON from unreliable LLM output (direct parse → markdown extraction → regex). This is real-world defensive coding.
- Temperature is 0.3 for the judge (low = consistent scoring)
- `_build_criteria_block()` — makes criteria user-configurable

## app/engine/strategies.py — Strategy pattern
**Does:** Implements the three refinement modes. Each strategy decides how to build prompts and who evaluates.
**Connects to:** domain models, called by refinement.py
**Design rule:** Strategy Pattern. The engine calls `strategy.build_generation_prompt()` without knowing which mode.
**Look for:**
- `SelfRefineStrategy` — same model judges itself. Evaluator config = generator config.
- `CrossModelStrategy` — separate judge. Evaluator config MUST be different.
- `PromptOptimizationStrategy` — stubbed for Phase 3, but architecture is ready.
- `get_strategy()` — factory function maps enum to class.
- How feedback from previous iterations gets injected into the next prompt.

## app/engine/refinement.py — The core loop
**Does:** Orchestrates everything. Runs the generate→evaluate→converge loop.
**Connects to:** strategies.py, evaluator.py, registry (via adapters), schemas (for events)
**Design rule:** The engine doesn't know about HTTP or WebSockets. It takes a callback and calls it.
**Look for:**
- `run_refinement()` — the main function. This IS the system.
- `on_event` callback — decouples the engine from the transport layer. WebSocket? REST? Tests? All work.
- Convergence check after each iteration
- Error handling: catches exceptions, marks run as failed, emits error event
- The loop is a simple for-loop. No magic. Generate, evaluate, record, check, repeat.

---

## app/api/routes.py — REST endpoints
**Does:** Thin HTTP layer. Validates input, calls engine, formats output.
**Connects to:** schemas.py, engine/refinement.py, storage/runs.py
**Design rule:** No business logic in route handlers. If you see an if/else about refinement here, it's wrong.
**Look for:**
- `POST /api/runs` — starts a run (synchronous, returns when done)
- `GET /api/models` — lists available models (based on configured keys)
- `_run_to_detail()` and `_run_to_summary()` — response builders that translate domain → API

## app/api/websocket.py — Real-time streaming
**Does:** WebSocket endpoint that streams iterations as they happen.
**Connects to:** engine/refinement.py (via on_event callback), storage
**Look for:**
- `send_event` closure — this IS the callback the engine calls
- Client sends StartRunRequest as JSON, server streams IterationEvent back
- Connection stays open for multiple runs

---

## app/storage/runs.py — Persistence
**Does:** Saves completed runs as JSON files. Simple, swappable.
**Connects to:** domain models (serializes RefinementRun)
**Design rule:** The interface is async. Swap JSON files for SQLite/Postgres without touching anything else.
**Look for:** Path sanitization in `_path()` to prevent directory traversal.
