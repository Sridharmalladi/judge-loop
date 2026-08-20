import { useEffect, useState } from "react";
import type { ArenaRunState, ModelLaneState } from "../types/domain";
import { ARENA_MODELS, mockDraftResponse, mockOverallScore, mockScores } from "./mockContent";

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (isCancelled()) clearTimeout(t);
  });
}

export function useArenaRun(prompt: string) {
  const [state, setState] = useState<ArenaRunState>({
    lanes: ARENA_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      colorVar: m.colorVar,
      status: "queued",
      text: "",
      score: null,
      elapsedMs: null,
    })),
    isRunning: true,
    isDone: false,
  });

  useEffect(() => {
    // Local closure, not a ref — see usePipelineRun.ts for why a shared ref
    // breaks under StrictMode's double-invoke.
    let isCancelled = false;
    const cancelled = () => isCancelled;
    const startedAt = Date.now();

    function patchLane(id: string, patch: Partial<ModelLaneState>) {
      if (cancelled()) return;
      setState((s) => ({
        ...s,
        lanes: s.lanes.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    }

    async function runLane(id: string, name: string, delayOffset: number) {
      await sleep(delayOffset, cancelled);
      if (cancelled()) return;
      patchLane(id, { status: "generating" });

      const text = mockDraftResponse(prompt, 2);
      const chunk = Math.max(1, Math.floor(text.length / 50));
      let acc = "";
      for (let i = 0; i < text.length; i += chunk) {
        if (cancelled()) return;
        acc = text.slice(0, i + chunk);
        patchLane(id, { text: acc });
        await sleep(24 + (delayOffset % 15), cancelled);
      }
      if (cancelled()) return;
      patchLane(id, { text, status: "evaluating" });
      await sleep(600 + delayOffset, cancelled);
      if (cancelled()) return;

      const dims = mockScores(3, name.length * 7 + delayOffset);
      // mockScores' jitter averages out across 5 dimensions, so every lane
      // converges to nearly the same overall — fine for one model's own
      // round-over-round trend, but it means an arena of 3 different models
      // ties every time. Add real per-lane spread so there's an actual winner.
      const spread = Math.round((Math.random() - 0.5) * 30);
      const score = Math.max(20, Math.min(99, mockOverallScore(dims) + spread));
      patchLane(id, { status: "finished", score, elapsedMs: Date.now() - startedAt });
    }

    async function run() {
      await Promise.all(ARENA_MODELS.map((m, i) => runLane(m.id, m.name, i * 350)));
      if (!cancelled()) {
        setState((s) => ({ ...s, isRunning: false, isDone: true }));
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  return state;
}
