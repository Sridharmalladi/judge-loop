# How to learn this codebase with Claude Code

## Getting started

```bash
cd judge-loop
claude
```

Then paste one of the prompts below. Each one is a self-contained learning session.

---

## Session 1: The 10-minute overview

```
Read docs/COMPONENT_MAP.md, then show me the project structure with `find backend/app -name "*.py" | head -20`. 

Walk me through the codebase starting from main.py. For each file: show the code, explain the key design decision in ONE sentence, then ask me one question about it before moving on. Keep it fast — I want the full picture in 10 minutes.
```

## Session 2: The refinement loop deep dive

```
Read backend/app/engine/refinement.py. This is the core of the system. 

Walk me through run_refinement() line by line. For each step, show me the code it calls (strategy, evaluator, registry). After each step, ask me: "What data goes in? What comes out? What could go wrong?"

Don't move to the next step until I answer correctly.
```

## Session 3: The adapter pattern

```
Read backend/app/adapters/base.py, then groq_adapter.py, then gemini_adapter.py.

Explain why Groq and Gemini have completely different API formats but the engine doesn't care. Then challenge me: "If I wanted to add an Anthropic adapter, what would I need to write and where?" Review my answer.
```

## Session 4: The evaluator (hardest part)

```
Read backend/app/engine/evaluator.py completely. 

This is the most critical component — if the judge is bad, everything is bad. Walk me through:
1. The JUDGE_SYSTEM_PROMPT — why is it structured this way?
2. The _parse_judge_response() fallbacks — why three strategies?
3. Why temperature=0.3 for the judge but 0.7 for the generator?

Then ask me: "If you were interviewing someone about this project and they said 'the LLM scores its own responses,' what would you correct?"
```

## Session 5: The strategy pattern

```
Read backend/app/engine/strategies.py.

Show me SelfRefineStrategy and CrossModelStrategy side by side. 
Ask me: "What's the ONE thing that changes between these two? Everything else is identical — what's the difference and why does it matter?"

Then show me get_strategy() and ask: "If I add a fourth mode next month, what do I change? What do I NOT change?"
```

## Session 6: Data model review

```
Read backend/app/models/domain.py and backend/app/models/schemas.py.

Quiz me:
1. What's the difference between RefinementRun and StartRunRequest? Why separate files?
2. What does has_converged() check? Give me a number example.
3. Why does Iteration store prompt_used instead of just the response?
4. Why is EvaluationResult.score bounded with Field(ge=0.0, le=10.0)?

Don't give me the answers — make me find them in the code.
```

## Session 7: Break things on purpose

```
Let's test my understanding by breaking things. Guide me through these experiments:

1. Remove the convergence check in refinement.py. What happens?
2. Change the judge temperature from 0.3 to 1.5. What changes about the scores?
3. Remove one of the JSON parse fallbacks in evaluator.py. When does it fail?
4. Make the WebSocket handler NOT use the on_event callback. How does the frontend break?

For each one, help me predict what breaks BEFORE I change the code.
```

## Session 8: Interview prep

```
Pretend you're a senior engineer interviewing me about this project. Ask me:

1. "Walk me through what happens when a user clicks 'Start Refinement'."
2. "Why did you use the Strategy pattern instead of if/else?"
3. "How does your system handle rate limits from the model APIs?"
4. "What's the hardest engineering problem in this project?"
5. "If you had another week, what would you add?"

Be tough. Push back on vague answers. Make me be specific.
```
