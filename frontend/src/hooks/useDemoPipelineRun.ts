import { useEffect, useState } from "react";
import type { PipelineRunState, StepKind, StepState } from "../types/domain";
import { emptySteps, formatModelLabel, sleep, toScoreDimensions, withLog } from "../lib/pipelineRunShared";
import { demoCritique, demoDimensionScores, demoResponse, demoScore, demoSeed } from "../lib/demoContent";

interface Options {
  prompt: string;
  strategy: "self_refine" | "prompt_optimization" | "cross_model";
  provider: string;
  model: string;
  maxRounds: number;
  evaluatorProvider?: string;
  evaluatorModel?: string;
}

// Same PipelineRunState shape and staged-reveal feel as useRealPipelineRun,
// but nothing here ever leaves the browser — no websocket, no fetch. Exists
// so Demo mode always completes, instantly available even if the backend
// or every provider's free tier is down.
export function useDemoPipelineRun({
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
  const [error] = useState<string | null>(null);
  const generatorLabel = formatModelLabel(provider, model);
  const evaluatorLabel =
    evaluatorProvider && evaluatorModel ? formatModelLabel(evaluatorProvider, evaluatorModel) : "";

  useEffect(() => {
    if (!prompt || !provider || !model) return;

    let isCancelled = false;
    const cancelled = () => isCancelled;
    const startedAt = Date.now();
    const seed = demoSeed(prompt);

    const timer = setInterval(() => {
      if (cancelled()) return;
      setState((s) => (s.isRunning ? { ...s, elapsedMs: Date.now() - startedAt } : s));
    }, 100);

    function updateStep(kind: StepKind, patch: Partial<StepState>) {
      if (cancelled()) return;
      setState((s) => ({ ...s, steps: s.steps.map((st) => (st.kind === kind ? { ...st, ...patch } : st)) }));
    }

    function pushLog(text: string, tone: "info" | "good" | "bad" = "info") {
      if (cancelled()) return;
      setState((s) => withLog(s, text, tone));
    }

    async function streamInto(kind: StepKind, text: string) {
      updateStep(kind, { status: "active", content: "" });
      const chunk = Math.max(1, Math.floor(text.length / 50));
      for (let i = 0; i < text.length; i += chunk) {
        if (cancelled()) return;
        updateStep(kind, { content: text.slice(0, i + chunk) });
        setState((s) => (cancelled() ? s : { ...s, tokenCount: s.tokenCount + Math.round(chunk / 4) }));
        await sleep(14, cancelled);
      }
      if (cancelled()) return;
      updateStep(kind, { content: text, status: "complete" });
    }

    let lastScore = -Infinity;

    async function runRound(round: number) {
      if (cancelled()) return;
      setState((s) => ({ ...s, round, steps: emptySteps() }));
      await sleep(150, cancelled);

      updateStep("prompt", { status: "active", content: "" });
      await sleep(200, cancelled);
      if (cancelled()) return;
      updateStep("prompt", { status: "complete", content: prompt });
      await sleep(150, cancelled);

      pushLog(`Round ${round} — ${generatorLabel} is responding…`);
      const response = demoResponse(prompt, round, strategy);
      await streamInto("generation", response);
      await sleep(200, cancelled);

      const judgeLabel = evaluatorLabel || generatorLabel;
      pushLog(`${judgeLabel} is scoring round ${round}…`);
      updateStep("evaluation", { status: "active", content: "" });
      await sleep(400, cancelled);
      if (cancelled()) return;
      const rawScore = demoScore(round, seed);
      const dims = demoDimensionScores(round, seed);
      const scaled = Math.round(rawScore * 10);
      const scoreDims = toScoreDimensions(dims);
      updateStep("evaluation", { status: "complete", content: `Overall: ${scaled}/100`, scores: scoreDims });
      pushLog(`Score: ${scaled}/100`, scaled >= 70 ? "good" : scaled < 40 ? "bad" : "info");
      await sleep(200, cancelled);

      pushLog(`Judge critique coming in for round ${round}…`);
      const { critique, strengths, weaknesses, suggestions } = demoCritique(round, rawScore, seed);
      const critiqueText =
        [critique, ...strengths.map((s) => `+ ${s}`), ...weaknesses.map((w) => `• ${w}`), ...suggestions.map((s) => `→ ${s}`)]
          .filter(Boolean)
          .join("\n");
      await streamInto("critique", critiqueText);
      if (cancelled()) return;

      const roundSteps: StepState[] = [
        { kind: "prompt", status: "complete", content: prompt },
        { kind: "generation", status: "complete", content: response },
        { kind: "evaluation", status: "complete", content: `Overall: ${scaled}/100`, scores: scoreDims },
        { kind: "critique", status: "complete", content: critiqueText },
      ];
      setState((s) => ({ ...s, history: [...s.history, { round, score: scaled, steps: roundSteps }] }));
      const delta = Math.abs(scaled - lastScore);
      lastScore = scaled;
      await sleep(300, cancelled);
      return delta;
    }

    async function run() {
      // Yield once before the first state write — StrictMode's dev-only
      // mount->cleanup->remount happens synchronously, so waiting a tick
      // lets a throwaway first mount's cleanup flip isCancelled before it
      // ever logs anything, the same way the real hook's first action
      // (a WebSocket handshake) is naturally async and gets the same effect.
      await sleep(0, cancelled);
      if (cancelled()) return;
      pushLog(`Connected — ${generatorLabel} starting round 1… (demo, no API calls)`);
      for (let round = 1; round <= maxRounds; round++) {
        if (cancelled()) return;
        const delta = await runRound(round);
        // Demo scores climb toward a plateau — stop like a converged real
        // run would once round-over-round movement is small, instead of
        // always burning every round.
        if (round >= 3 && delta != null && delta < 5) break;
      }
      if (cancelled()) return;
      setState((s) =>
        withLog(
          { ...s, isRunning: false, isDone: true },
          `Run complete — final score ${s.history[s.history.length - 1]?.score ?? "—"}/100`,
          "good",
        ),
      );
    }

    run();

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, strategy, provider, model, maxRounds, evaluatorProvider, evaluatorModel]);

  return { state, error, generatorLabel, evaluatorLabel };
}
