export type RunMode = "self_refine" | "cross_model" | "prompt_optimization";

export type StepKind = "prompt" | "generation" | "evaluation" | "critique" | "refinement";
export type StepStatus = "locked" | "active" | "complete";

export type CharacterState = "idle" | "thinking" | "writing" | "talking" | "nod" | "shake" | "celebrate" | "sad";

export interface TickerEntry {
  id: string;
  text: string;
  tone: "info" | "good" | "bad";
}

export interface ScoreDimension {
  label: string;
  value: number;
}

export interface StepState {
  kind: StepKind;
  status: StepStatus;
  content: string;
  scores?: ScoreDimension[];
}

export interface RoundResult {
  round: number;
  score: number;
  steps: StepState[];
}

export interface PipelineRunState {
  round: number;
  maxRounds: number;
  steps: StepState[];
  history: RoundResult[];
  elapsedMs: number;
  tokenCount: number;
  isRunning: boolean;
  isDone: boolean;
  tickerLog: TickerEntry[];
}

export const STEP_SUBTITLES: Record<StepKind, string> = {
  prompt: "The starting question or task sent to the model",
  generation: "The model writes its response — tokens stream in live",
  evaluation: "Each quality dimension is scored on a 0–100 rubric",
  critique: "The judge reviews the response and identifies weaknesses",
  refinement: "A new, improved response incorporating the feedback",
};

export const STEP_LABELS: Record<StepKind, string> = {
  prompt: "1. PROMPT",
  generation: "2. GENERATION",
  evaluation: "3. EVALUATION",
  critique: "4. CRITIQUE",
  refinement: "5. REFINEMENT",
};
