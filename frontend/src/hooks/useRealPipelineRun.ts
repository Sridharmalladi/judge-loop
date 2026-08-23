import { useEffect, useState } from "react";
import { WS_URL } from "../lib/api";
import type { PipelineRunState, StepKind, StepState, TickerEntry } from "../types/domain";
import { emptySteps, formatModelLabel, sleep, toScoreDimensions, withLog } from "../lib/pipelineRunShared";

// Real backend delivers one complete result per round (not staged
// prompt->generation->evaluation->critique->refinement events) — so real
// mode has 4 stages, not 5. The judge does return a per-dimension score
// breakdown though, which drives the evaluation step's radar chart.
// Used for all three real strategies — self_refine and prompt_optimization
// judge themselves, cross_model sends a separate evaluator_provider/model
// and a different model plays judge; the event shape is identical either way.

interface RealIterationEvent {
  type: "iteration";
  run_id: string;
  iteration_number: number;
  response: string;
  score: number;
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  dimension_scores: Record<string, number>;
  improvement_delta: number | null;
  latency_ms: number;
  model_used: string;
  is_final: boolean;
  status: string;
}

type WsMessage =
  | { type: "status"; run_id: string; strategy: string; generator: string; evaluator?: string | null; max_iterations: number }
  | RealIterationEvent
  | { type: "complete"; run_id: string; final_score: number | null; status: string }
  | { type: "error"; error: string };

interface Options {
  prompt: string;
  strategy: "self_refine" | "prompt_optimization" | "cross_model";
  provider: string;
  model: string;
  maxRounds: number;
  // cross_model only — a separate judge model. Ignored otherwise.
  evaluatorProvider?: string;
  evaluatorModel?: string;
  // BYOK — sent once with the start request, never stored (see
  // ModelConfig.api_key server-side). Omitted entirely for real/demo runs.
  apiKey?: string;
  evaluatorApiKey?: string;
}

export function useRealPipelineRun({
  prompt,
  strategy,
  provider,
  model,
  maxRounds,
  evaluatorProvider,
  evaluatorModel,
  apiKey,
  evaluatorApiKey,
}: Options) {
  const [state, setState] = useState<PipelineRunState>({
    round: 1,
    maxRounds,
    steps: emptySteps(),
    history: [],
    elapsedMs: 0,
    tokenCount: 0,
    isRunning: true,
    isDone: false,
    tickerLog: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [generatorLabel, setGeneratorLabel] = useState(formatModelLabel(provider, model));
  const [evaluatorLabel, setEvaluatorLabel] = useState(
    evaluatorProvider && evaluatorModel ? formatModelLabel(evaluatorProvider, evaluatorModel) : "",
  );

  useEffect(() => {
    // Defense in depth — PipelineRunPage's own effect redirects home when
    // these are missing, but a hook shouldn't rely on the caller's timing
    // to avoid opening a socket with an invalid request.
    if (!prompt || !provider || !model) return;

    // Local closures, not refs — see the mock hooks for why a shared ref
    // breaks this exact pattern under StrictMode's double-invoke.
    let isCancelled = false;
    const cancelled = () => isCancelled;
    // Set once a terminal outcome has actually been applied to state —
    // guards onclose from double-reporting after onmessage already handled
    // a clean "complete"/"error" frame earlier in the chain.
    let settled = false;
    const startedAt = Date.now();
    // Updated from the "status" ws frame — the generatorLabel *state* is
    // one render behind inside this closure, so track it locally for
    // ticker text instead of reading the stale outer variable.
    let activeLabel = formatModelLabel(provider, model);

    const timer = setInterval(() => {
      if (cancelled()) return;
      setState((s) => (s.isRunning ? { ...s, elapsedMs: Date.now() - startedAt } : s));
    }, 100);

    function updateStep(kind: StepKind, patch: Partial<StepState>) {
      if (cancelled()) return;
      setState((s) => ({
        ...s,
        steps: s.steps.map((st) => (st.kind === kind ? { ...st, ...patch } : st)),
      }));
    }

    function pushLog(text: string, tone: TickerEntry["tone"] = "info") {
      if (cancelled()) return;
      setState((s) => withLog(s, text, tone));
    }

    // The real backend can resolve a whole round in well under a second —
    // too fast for a "generator writes, judge scores, judge critiques"
    // exchange between two characters to actually read. These are a floor
    // on how long each beat holds on screen, independent of how fast the
    // response already arrived, so the back-and-forth stays followable
    // whether the round took 400ms or 4s server-side.
    const ROUND_INTRO_MS = 350; // beat before the round's first step lights up
    const PROMPT_LIGHT_MS = 300; // step lights up before its content lands
    const PROMPT_HOLD_MS = 900; // time to actually read the prompt
    const POST_GENERATION_MS = 500; // beat after the draft before the judge visibly steps in
    const JUDGE_THINK_MS = 1100; // "judge is scoring" — the moment that most needs weight
    const POST_SCORE_MS = 600; // let the number land before the critique starts
    const ROUND_OUTRO_MS = 700; // beat after the round settles, before the next one begins
    const STREAM_STEP_MS = 24; // per-chunk delay for the generation/critique text reveal

    async function streamInto(kind: StepKind, text: string) {
      updateStep(kind, { status: "active", content: "" });
      const safeText = text || "(empty response)";
      let acc = "";
      const chunk = Math.max(1, Math.floor(safeText.length / 50));
      for (let i = 0; i < safeText.length; i += chunk) {
        if (cancelled()) return;
        acc = safeText.slice(0, i + chunk);
        updateStep(kind, { content: acc });
        setState((s) => (cancelled() ? s : { ...s, tokenCount: s.tokenCount + Math.round(chunk / 4) }));
        await sleep(STREAM_STEP_MS, cancelled);
      }
      if (cancelled()) return;
      updateStep(kind, { content: safeText, status: "complete" });
    }

    async function revealIteration(ev: RealIterationEvent) {
      const round = ev.iteration_number;
      if (cancelled()) return;
      setState((s) => ({ ...s, round, steps: emptySteps() }));
      await sleep(ROUND_INTRO_MS, cancelled);

      // 1. PROMPT — the composed prompt (original + injected judge feedback
      // for round > 1) isn't sent over the wire, so this shows the original
      // task every round rather than guess at the exact server-side text.
      updateStep("prompt", { status: "active", content: "" });
      await sleep(PROMPT_LIGHT_MS, cancelled);
      if (cancelled()) return;
      updateStep("prompt", { status: "complete", content: prompt });
      await sleep(PROMPT_HOLD_MS, cancelled);

      // 2. GENERATION — real model output
      pushLog(`Round ${round}: ${activeLabel} is responding…`);
      await streamInto("generation", ev.response);
      await sleep(POST_GENERATION_MS, cancelled);

      // 3. EVALUATION — real judge score, x10 to match the UI's /100 scale
      pushLog(`Judge is scoring round ${round}…`);
      updateStep("evaluation", { status: "active", content: "" });
      await sleep(JUDGE_THINK_MS, cancelled);
      if (cancelled()) return;
      const scaled = Math.round(ev.score * 10);
      const dims = toScoreDimensions(ev.dimension_scores ?? {});
      updateStep("evaluation", { status: "complete", content: `Overall: ${scaled}/100`, scores: dims });
      pushLog(`Score: ${scaled}/100`, scaled >= 70 ? "good" : scaled < 40 ? "bad" : "info");
      await sleep(POST_SCORE_MS, cancelled);

      // 4. CRITIQUE — real judge critique/strengths/weaknesses/suggestions
      pushLog(`Judge critique coming in for round ${round}…`);
      const critiqueText =
        [
          ev.critique,
          ...ev.strengths.map((s) => `+ ${s}`),
          ...ev.weaknesses.map((w) => `• ${w}`),
          ...ev.suggestions.map((s) => `→ ${s}`),
        ]
          .filter(Boolean)
          .join("\n") || "No critique returned.";
      await streamInto("critique", critiqueText);

      if (cancelled()) return;
      const roundSteps: StepState[] = [
        { kind: "prompt", status: "complete", content: prompt },
        { kind: "generation", status: "complete", content: ev.response || "(empty response)" },
        { kind: "evaluation", status: "complete", content: `Overall: ${scaled}/100`, scores: dims },
        { kind: "critique", status: "complete", content: critiqueText },
      ];
      setState((s) => ({ ...s, history: [...s.history, { round, score: scaled, steps: roundSteps }] }));
      await sleep(ROUND_OUTRO_MS, cancelled);
    }

    // A single chained promise sequences reveals in arrival order — every
    // "iteration" message appends to the chain, and a terminal outcome
    // (complete/error/close) attaches after it, so it never cuts off or
    // visually clashes with a round still mid-reveal. Replaces an earlier
    // array-queue + polling implementation that needed three cooperating
    // pieces of state to express the same ordering guarantee.
    let revealChain: Promise<void> = Promise.resolve();

    function settle(apply: () => void) {
      revealChain = revealChain.then(() => {
        if (cancelled() || settled) return;
        settled = true;
        apply();
      });
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          prompt,
          strategy,
          generator_provider: provider,
          generator_model: model,
          ...(evaluatorProvider && evaluatorModel
            ? { evaluator_provider: evaluatorProvider, evaluator_model: evaluatorModel }
            : {}),
          ...(apiKey ? { generator_api_key: apiKey } : {}),
          ...(evaluatorApiKey ? { evaluator_api_key: evaluatorApiKey } : {}),
          temperature: 0.7,
          max_tokens: 640,
          max_iterations: maxRounds,
          convergence_threshold: 0.5,
        }),
      );
    };

    ws.onmessage = (evt) => {
      if (cancelled()) return;
      let msg: WsMessage;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        settle(() => {
          setError("Received a malformed message from the server");
          setState((s) => ({ ...s, isRunning: false, isDone: true }));
        });
        return;
      }

      if (msg.type === "status") {
        activeLabel = msg.generator;
        setGeneratorLabel(msg.generator);
        if (msg.evaluator) setEvaluatorLabel(msg.evaluator);
        pushLog(`Connected. ${msg.generator} is starting round 1…`);
      } else if (msg.type === "iteration") {
        revealChain = revealChain.then(() => (cancelled() ? undefined : revealIteration(msg)));
      } else if (msg.type === "complete") {
        settle(() =>
          setState((s) =>
            withLog(
              { ...s, isRunning: false, isDone: true },
              `Run complete. Final score ${s.history[s.history.length - 1]?.score ?? "0"}/100`,
              "good",
            ),
          ),
        );
      } else if (msg.type === "error") {
        settle(() => {
          setError(msg.error);
          setState((s) => withLog({ ...s, isRunning: false, isDone: true }, `Error: ${msg.error}`, "bad"));
        });
      }
    };

    ws.onerror = () => {
      settle(() => {
        setError("WebSocket connection failed");
        setState((s) => withLog({ ...s, isRunning: false, isDone: true }, "WebSocket connection failed", "bad"));
      });
    };

    ws.onclose = () => {
      // No prior complete/error frame means the connection dropped
      // mid-run (backend restart, proxy timeout, network blip) — without
      // this, the UI freezes on a blinking step forever with no recovery
      // short of navigating away manually.
      settle(() => {
        setError("Connection closed unexpectedly");
        setState((s) => withLog({ ...s, isRunning: false, isDone: true }, "Connection closed unexpectedly", "bad"));
      });
    };

    return () => {
      isCancelled = true;
      clearInterval(timer);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, strategy, provider, model, maxRounds, evaluatorProvider, evaluatorModel, apiKey, evaluatorApiKey]);

  return { state, error, generatorLabel, evaluatorLabel };
}
