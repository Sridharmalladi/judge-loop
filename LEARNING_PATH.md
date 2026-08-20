# Refinement Arena — Interactive Learning Path

## What you're building

An LLM refinement and evaluation platform that demonstrates iterative self-improvement through structured feedback loops. Three modes (self-refine, cross-model eval, prompt optimization), retro terminal UI, multiple free model APIs.

**Stack:** FastAPI (Python) + React (TypeScript) + WebSockets

## How to use this with Claude Code

This isn't a tutorial you read — it's a **curriculum Claude Code follows while pair-programming with you**. Each lesson has:

- **Concepts** — what you need to understand before coding
- **Build steps** — what Claude Code helps you create
- **Review checkpoints** — questions Claude Code asks YOU (not the other way around)
- **Challenges** — extensions you should attempt before moving on

### Getting started

Open your terminal in this directory and start Claude Code:

```bash
claude
```

Then tell it:

```
Read LEARNING_PATH.md and lessons/00-project-setup.md. 
Walk me through the first lesson interactively — quiz me on the concepts 
before we write any code, and stop me if I'm about to make a mistake.
```

### Rules of engagement

1. **Don't let Claude Code write everything.** When it shows you code, read it. Ask "why did you do X instead of Y?" The understanding matters more than the output.
2. **Attempt the challenges.** They're designed to expose gaps. Getting stuck is the learning.
3. **Review checkpoints are mandatory.** If you can't explain WHY a piece of code works, you don't understand it yet — have Claude Code explain it differently.
4. **Break things on purpose.** After each lesson, try removing a piece and see what fails. The error messages teach you the dependency chain.

## Lesson sequence

| # | Lesson | What you build | Key patterns |
|---|--------|---------------|--------------|
| 00 | [Project setup](lessons/00-project-setup.md) | Repo structure, deps, dev environment | Monorepo layout, virtual envs |
| 01 | [Data model](lessons/01-data-model.md) | Pydantic models for the entire system | Domain modeling, type safety |
| 02 | [Model adapters](lessons/02-model-adapters.md) | Unified interface to Groq/Together/Gemini | Adapter pattern, async, error handling |
| 03 | [Evaluation engine](lessons/03-evaluation-engine.md) | LLM-as-Judge scoring system | Structured output, rubrics |
| 04 | [Refinement loop](lessons/04-refinement-loop.md) | The core generate→evaluate→refine pipeline | Strategy pattern, convergence detection |
| 05 | [API layer](lessons/05-api-layer.md) | FastAPI endpoints + WebSocket streaming | REST design, real-time data |
| 06 | [Frontend foundation](lessons/06-frontend-foundation.md) | React app, retro design system, routing | Component architecture, CSS variables |
| 07 | [Live refinement view](lessons/07-live-refinement-view.md) | Real-time iteration UI with score charts | WebSocket client, Recharts, state |
| 08 | [Comparison & analytics](lessons/08-comparison-analytics.md) | Model comparison arena, diff view | Complex state, data visualization |
| 09 | [Remaining modes](lessons/09-remaining-modes.md) | Cross-model eval + prompt optimization | Extending the strategy pattern |
| 10 | [Deploy & polish](lessons/10-deploy-polish.md) | Docker, demo presets, README, edge cases | Production readiness |

## Project structure (what you'll have at the end)

```
refinement-arena/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── config.py               # Settings, API keys
│   │   ├── models/
│   │   │   ├── schemas.py          # Pydantic request/response models
│   │   │   └── domain.py           # Core domain types
│   │   ├── adapters/
│   │   │   ├── base.py             # Abstract model adapter
│   │   │   ├── groq_adapter.py
│   │   │   ├── together_adapter.py
│   │   │   ├── gemini_adapter.py
│   │   │   └── registry.py         # Model registry
│   │   ├── engine/
│   │   │   ├── evaluator.py        # LLM-as-Judge scoring
│   │   │   ├── refinement.py       # Core refinement loop
│   │   │   └── strategies.py       # Self-refine, cross-model, prompt-opt
│   │   ├── api/
│   │   │   ├── routes.py           # REST endpoints
│   │   │   └── websocket.py        # WebSocket streaming
│   │   └── storage/
│   │       └── runs.py             # Run persistence (SQLite)
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── design-system/          # Retro terminal theme
│   │   ├── components/
│   │   │   ├── RefinementView/     # Live iteration display
│   │   │   ├── ComparisonArena/    # Side-by-side model comparison
│   │   │   ├── ScoreChart/         # Convergence visualization
│   │   │   └── DiffView/           # Iteration diff display
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts     # WebSocket connection
│   │   │   └── useRefinement.ts    # Refinement state management
│   │   └── types/
│   │       └── index.ts            # TypeScript types matching backend
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── lessons/                        # This learning guide
└── README.md
```

## A note on the engineering mindset

Every decision in this project has a **reason**. When Claude Code suggests a pattern, your job is to ask "why this and not that?" Here's the mental model:

- **Data model first** → because everything else depends on it
- **Backend before frontend** → because you can test the pipeline without UI
- **One mode working fully before adding others** → because a half-working feature is worse than a missing one
- **Adapters abstracted from day one** → because adding a new model should be one file, not a refactor

This is how teams that ship good software think. Not "what's the fastest way to get something on screen" but "what's the order that minimizes rework?"
