import type { PipelineRunState, ScoreDimension, StepKind, StepState, TickerEntry } from "../types/domain";

// Shared by useRealPipelineRun and useDemoPipelineRun — pure helpers only.
// The stateful effect/closure logic stays independent per hook on purpose
// (see useRealPipelineRun's "local closures, not refs" note about
// StrictMode's double-invoke) rather than risking a shared abstraction
// there.
export const STEP_ORDER: StepKind[] = ["prompt", "generation", "evaluation", "critique"];

export const DIMENSION_LABELS: Record<string, string> = {
  relevance: "Relevance",
  coherence: "Coherence",
  completeness: "Completeness",
  conciseness: "Conciseness",
  accuracy: "Accuracy",
  creativity: "Creativity",
};

export function toScoreDimensions(dimensionScores: Record<string, number>): ScoreDimension[] {
  return Object.entries(dimensionScores).map(([key, value]) => ({
    label: DIMENSION_LABELS[key] ?? key,
    value: Math.round(value * 10),
  }));
}

export function emptySteps(): StepState[] {
  return STEP_ORDER.map((kind) => ({ kind, status: "locked", content: "" }));
}

// Mirrors the backend's ModelConfig.display_name — some providers' own
// model IDs are self-prefixed (Groq's "groq/compound-mini"), so a naive
// `${provider}/${model}` doubles it to "groq/groq/compound-mini". Real mode
// gets the correct label from the backend after the first message; demo
// mode has no backend to correct it, so both need this up front.
export function formatModelLabel(provider: string, model: string): string {
  return model.startsWith(`${provider}/`) ? model : `${provider}/${model}`;
}

export function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (isCancelled()) clearTimeout(t);
  });
}

let logSeq = 0;

export function withLog(s: PipelineRunState, text: string, tone: TickerEntry["tone"] = "info"): PipelineRunState {
  const entry: TickerEntry = { id: `${Date.now()}-${logSeq++}`, text, tone };
  return { ...s, tickerLog: [...s.tickerLog.slice(-39), entry] };
}
