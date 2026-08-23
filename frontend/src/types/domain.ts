export type RunMode = "self_refine" | "cross_model" | "prompt_optimization";

// Where the run's model calls actually come from — orthogonal to RunMode.
// byok: caller's own API key(s), used for exactly that run, never stored server-side.
// real: this app's own shared backend keys.
export type RunSource = "byok" | "real";

export type StepKind = "prompt" | "generation" | "evaluation" | "critique";
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
  prompt: "The question or task the model is asked to answer",
  generation: "The model writes its answer, live, word by word",
  evaluation: "Every quality dimension gets a score from 0 to 100",
  critique: "The judge reads the answer and points out what could be better",
};

export const STEP_LABELS: Record<StepKind, string> = {
  prompt: "1. PROMPT",
  generation: "2. GENERATION",
  evaluation: "3. EVALUATION",
  critique: "4. CRITIQUE",
};
