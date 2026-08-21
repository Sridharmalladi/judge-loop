import type { CharacterState, StepState } from "../types/domain";

export function stepsToCharacterState(
  steps: StepState[],
  isDone: boolean,
  hasError: boolean,
): { state: CharacterState; caption: string } {
  if (hasError) return { state: "sad", caption: "hit an error…" };
  if (isDone) return { state: "celebrate", caption: "done!" };

  const active = steps.find((s) => s.status === "active");
  if (!active) return { state: "idle", caption: "warming up…" };

  switch (active.kind) {
    case "prompt":
      return { state: "thinking", caption: "reading the prompt…" };
    case "generation":
      return { state: "writing", caption: "writing a draft…" };
    case "evaluation":
      return { state: "thinking", caption: "judge is scoring…" };
    case "critique":
    case "refinement":
      return { state: "talking", caption: "reviewing its own work…" };
    default:
      return { state: "idle", caption: "" };
  }
}

// Cross-model's judge is a separate character watching the same step
// stream — it reacts to the generator's draft rather than producing one
// itself, so its states/captions are the mirror image of the generator's.
export function stepsToJudgeState(
  steps: StepState[],
  isDone: boolean,
  hasError: boolean,
  lastScore: number | null,
): { state: CharacterState; caption: string } {
  if (hasError) return { state: "sad", caption: "hit an error…" };
  if (isDone) {
    if (lastScore == null) return { state: "idle", caption: "run complete" };
    if (lastScore >= 70) return { state: "celebrate", caption: `final verdict: ${lastScore}/100` };
    if (lastScore < 40) return { state: "shake", caption: `final verdict: ${lastScore}/100` };
    return { state: "nod", caption: `final verdict: ${lastScore}/100` };
  }

  const active = steps.find((s) => s.status === "active");
  if (!active) return { state: "idle", caption: "waiting for a draft…" };

  switch (active.kind) {
    case "prompt":
    case "generation":
      return { state: "idle", caption: "waiting on the draft…" };
    case "evaluation":
      return { state: "thinking", caption: "scoring the response…" };
    case "critique":
      if (lastScore == null) return { state: "talking", caption: "delivering feedback…" };
      if (lastScore >= 70) return { state: "nod", caption: `${lastScore}/100 — solid` };
      if (lastScore < 40) return { state: "shake", caption: `${lastScore}/100 — needs work` };
      return { state: "talking", caption: `${lastScore}/100 — some notes` };
    default:
      return { state: "idle", caption: "" };
  }
}
