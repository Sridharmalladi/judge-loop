import { useEffect, useState } from "react";
import { WS_URL } from "../lib/api";
import type { PipelineRunState, ScoreDimension, StepKind, StepState, TickerEntry } from "../types/domain";

// Real backend delivers one complete result per round (not staged
// prompt->generation->evaluation->critique->refinement events) — so real
// mode has 4 stages, not 5. The judge does return a per-dimension score
// breakdown though, which drives the evaluation step's radar chart.
// Used for all three real strategies — self_refine and prompt_optimization
// judge themselves, cross_model sends a separate evaluator_provider/model
// and a different model plays judge; the event shape is identical either way.
const STEP_ORDER: StepKind[] = ["prompt", "generation", "evaluation", "critique"];

const DIMENSION_LABELS: Record<string, string> = {
  relevance: "Relevance",
  coherence: "Coherence",
  completeness: "Completeness",
  conciseness: "Conciseness",
  accuracy: "Accuracy",
  creativity: "Creativity",
};

function toScoreDimensions(dimensionScores: Record<string, number>): ScoreDimension[] {
  return Object.entries(dimensionScores).map(([key, value]) => ({
    label: DIMENSION_LABELS[key] ?? key,
    value: Math.round(value * 10),
  }));
}

function emptySteps(): StepState[] {
  return STEP_ORDER.map((kind) => ({ kind, status: "locked", content: "" }));
}

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (isCancelled()) clearTimeout(t);
  });
}

let logSeq = 0;

function withLog(s: PipelineRunState, text: string, tone: TickerEntry["tone"] = "info"): PipelineRunState {
  const entry: TickerEntry = { id: `${Date.now()}-${logSeq++}`, text, tone };
  return { ...s, tickerLog: [...s.tickerLog.slice(-39), entry] };
}

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
}

export function useRealPipelineRun({
  prompt,
  strategy,
  provider,
  model,
  maxRounds,
  evaluatorProvider,
  evaluatorModel,
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
  const [generatorLabel, setGeneratorLabel] = useState(`${provider}/${model}`);
  const [evaluatorLabel, setEvaluatorLabel] = useState(
    evaluatorProvider && evaluatorModel ? `${evaluatorProvider}/${evaluatorModel}` : "",
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
    let activeLabel = `${provider}/${model}`;

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
        await sleep(16, cancelled);
      }
      if (cancelled()) return;
      updateStep(kind, { content: safeText, status: "complete" });
    }

    async function revealIteration(ev: RealIterationEvent) {
      const round = ev.iteration_number;
      if (cancelled()) return;
      setState((s) => ({ ...s, round, steps: emptySteps() }));
      await sleep(150, cancelled);

      // 1. PROMPT — the composed prompt (original + injected judge feedback
      // for round > 1) isn't sent over the wire, so this shows the original
      // task every round rather than guess at the exact server-side text.
      updateStep("prompt", { status: "active", content: "" });
      await sleep(200, cancelled);
      if (cancelled()) return;
      updateStep("prompt", { status: "complete", content: prompt });
      await sleep(150, cancelled);

      // 2. GENERATION — real model output
      pushLog(`Round ${round} — ${activeLabel} is responding…`);
      await streamInto("generation", ev.response);
      await sleep(200, cancelled);

      // 3. EVALUATION — real judge score, x10 to match the UI's /100 scale
      pushLog(`Judge is scoring round ${round}…`);
      updateStep("evaluation", { status: "active", content: "" });
      await sleep(400, cancelled);
      if (cancelled()) return;
      const scaled = Math.round(ev.score * 10);
      const dims = toScoreDimensions(ev.dimension_scores ?? {});
      updateStep("evaluation", { status: "complete", content: `Overall: ${scaled}/100`, scores: dims });
      pushLog(`Score: ${scaled}/100`, scaled >= 70 ? "good" : scaled < 40 ? "bad" : "info");
      await sleep(200, cancelled);

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
      await sleep(300, cancelled);
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
          temperature: 0.7,
          max_tokens: 1024,
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
          setState((s) => ({ ...s, isRunning: false }));
        });
        return;
      }

      if (msg.type === "status") {
        activeLabel = msg.generator;
        setGeneratorLabel(msg.generator);
        if (msg.evaluator) setEvaluatorLabel(msg.evaluator);
        pushLog(`Connected — ${msg.generator} starting round 1…`);
      } else if (msg.type === "iteration") {
        revealChain = revealChain.then(() => (cancelled() ? undefined : revealIteration(msg)));
      } else if (msg.type === "complete") {
        settle(() =>
          setState((s) =>
            withLog(
              { ...s, isRunning: false, isDone: true },
              `Run complete — final score ${s.history[s.history.length - 1]?.score ?? "—"}/100`,
              "good",
            ),
          ),
        );
      } else if (msg.type === "error") {
        settle(() => {
          setError(msg.error);
          setState((s) => withLog({ ...s, isRunning: false }, `Error: ${msg.error}`, "bad"));
        });
      }
    };

    ws.onerror = () => {
      settle(() => {
        setError("WebSocket connection failed");
        setState((s) => withLog({ ...s, isRunning: false }, "WebSocket connection failed", "bad"));
      });
    };

    ws.onclose = () => {
      // No prior complete/error frame means the connection dropped
      // mid-run (backend restart, proxy timeout, network blip) — without
      // this, the UI freezes on a blinking step forever with no recovery
      // short of navigating away manually.
      settle(() => {
        setError("Connection closed unexpectedly");
        setState((s) => withLog({ ...s, isRunning: false }, "Connection closed unexpectedly", "bad"));
      });
    };

    return () => {
      isCancelled = true;
      clearInterval(timer);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, strategy, provider, model, maxRounds, evaluatorProvider, evaluatorModel]);

  return { state, error, generatorLabel, evaluatorLabel };
}
