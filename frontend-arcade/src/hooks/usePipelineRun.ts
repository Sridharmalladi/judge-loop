import { useEffect, useState } from "react";
import type { PipelineRunState, StepKind, StepState } from "../types/domain";
import {
  mockCritique,
  mockDraftResponse,
  mockOverallScore,
  mockScores,
  mockSuggestions,
  mockWeaknesses,
} from "./mockContent";

const STEP_ORDER: StepKind[] = ["prompt", "generation", "evaluation", "critique", "refinement"];

function emptySteps(): StepState[] {
  return STEP_ORDER.map((kind) => ({ kind, status: "locked", content: "" }));
}

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (isCancelled()) clearTimeout(t);
  });
}

interface Options {
  prompt: string;
  variant: "self_refine" | "prompt_optimization";
  maxRounds?: number;
  modelName?: string;
}

export function usePipelineRun({ prompt, variant, maxRounds = 4 }: Options) {
  const [state, setState] = useState<PipelineRunState>({
    round: 1,
    maxRounds,
    steps: emptySteps(),
    history: [],
    elapsedMs: 0,
    tokenCount: 0,
    isRunning: true,
    isDone: false,
  });

  useEffect(() => {
    // Local to this effect invocation — NOT a ref. A ref persists across
    // StrictMode's dev-only double-invoke, so the second mount's reset would
    // un-cancel the first mount's still-running async chain and both would
    // race, double-writing state. A fresh closure variable per invocation
    // keeps the two runs properly isolated.
    let isCancelled = false;
    const cancelled = () => isCancelled;
    const startedAt = Date.now();

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

    async function streamInto(kind: StepKind, text: string) {
      updateStep(kind, { status: "active", content: "" });
      let acc = "";
      const chunk = Math.max(1, Math.floor(text.length / 60));
      for (let i = 0; i < text.length; i += chunk) {
        if (cancelled()) return;
        acc = text.slice(0, i + chunk);
        updateStep(kind, { content: acc });
        setState((s) => (cancelled() ? s : { ...s, tokenCount: s.tokenCount + chunk }));
        await sleep(20, cancelled);
      }
      if (cancelled()) return;
      updateStep(kind, { content: text, status: "complete" });
    }

    async function run() {
      const rounds = maxRounds;
      for (let round = 1; round <= rounds; round++) {
        if (cancelled()) return;

        setState((s) => ({ ...s, round, steps: emptySteps() }));
        await sleep(150, cancelled);
        if (cancelled()) return;

        // 1. PROMPT
        const promptText =
          variant === "prompt_optimization" && round > 1
            ? `[template v${round}] ${prompt}\n\n(Instructions evolved from v${round - 1} based on aggregate test-case feedback.)`
            : prompt;
        updateStep("prompt", { status: "active", content: "" });
        await sleep(300, cancelled);
        updateStep("prompt", { status: "complete", content: promptText });
        await sleep(200, cancelled);

        // 2. GENERATION
        const draft = mockDraftResponse(prompt, round);
        await streamInto("generation", draft);
        await sleep(250, cancelled);

        // 3. EVALUATION
        updateStep("evaluation", { status: "active", content: "" });
        await sleep(500, cancelled);
        const dims = mockScores(round, round * 31 + prompt.length);
        const overall = mockOverallScore(dims);
        if (cancelled()) return;
        updateStep("evaluation", { status: "complete", content: `Overall: ${overall}/100`, scores: dims });
        await sleep(250, cancelled);

        // 4. CRITIQUE
        const critiqueText = [
          mockCritique(overall),
          ...mockWeaknesses(round).map((w) => `• ${w}`),
          ...(round < rounds ? mockSuggestions(round).map((s) => `→ ${s}`) : []),
        ].join("\n");
        await streamInto("critique", critiqueText);
        await sleep(250, cancelled);

        // 5. REFINEMENT
        const refinementContent =
          round < rounds
            ? mockDraftResponse(prompt, round + 1)
            : "Converged — max rounds reached. This is the final response.";
        if (round < rounds) {
          await streamInto("refinement", refinementContent);
        } else {
          updateStep("refinement", { status: "complete", content: refinementContent });
        }

        if (cancelled()) return;
        // Snapshot every step's final content from local vars (not from React
        // state, which the next round's emptySteps() reset will clobber) so
        // completed rounds stay browsable after the run finishes.
        const roundSteps: StepState[] = [
          { kind: "prompt", status: "complete", content: promptText },
          { kind: "generation", status: "complete", content: draft },
          { kind: "evaluation", status: "complete", content: `Overall: ${overall}/100`, scores: dims },
          { kind: "critique", status: "complete", content: critiqueText },
          { kind: "refinement", status: "complete", content: refinementContent },
        ];
        setState((s) => ({ ...s, history: [...s.history, { round, score: overall, steps: roundSteps }] }));
        await sleep(400, cancelled);
      }

      if (!cancelled()) {
        setState((s) => ({ ...s, isRunning: false, isDone: true }));
      }
    }

    run();

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, variant, maxRounds]);

  return state;
}
