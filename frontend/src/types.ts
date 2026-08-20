// Mirrors backend/app/models/{domain,schemas}.py — keep in sync.

export type RefinementStrategy = "self_refine" | "cross_model" | "prompt_optimization";
export type ModelProvider = "groq" | "together" | "gemini" | "huggingface";
export type RunStatusValue = "pending" | "running" | "completed" | "failed" | "converged";

export interface StartRunRequest {
  prompt: string;
  strategy: RefinementStrategy;
  generator_provider: ModelProvider;
  generator_model: string;
  evaluator_provider?: ModelProvider | null;
  evaluator_model?: string | null;
  temperature: number;
  max_tokens: number;
  max_iterations: number;
  convergence_threshold: number;
  custom_criteria?: string | null;
}

export interface IterationEvent {
  run_id: string;
  iteration_number: number;
  response: string;
  score: number;
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  improvement_delta: number | null;
  latency_ms: number;
  model_used: string;
  is_final: boolean;
  status: string;
}

export interface RunStartedEvent {
  run_id: string;
  strategy: string;
  generator: string;
  evaluator?: string | null;
  max_iterations: number;
}

export interface RunErrorEvent {
  run_id?: string;
  error: string;
  iteration_number?: number | null;
}

export interface RunCompleteEvent {
  type: "complete";
  run_id: string;
  final_score: number | null;
  initial_score: number | null;
  total_improvement: number | null;
  iteration_count: number;
  status: string;
}

export type WsInboundMessage =
  | ({ type: "status" } & RunStartedEvent)
  | ({ type: "iteration" } & IterationEvent)
  | RunCompleteEvent
  | ({ type: "error" } & RunErrorEvent);

export interface RunSummary {
  id: string;
  strategy: string;
  prompt_preview: string;
  generator: string;
  evaluator?: string | null;
  final_score: number | null;
  initial_score: number | null;
  total_improvement: number | null;
  iteration_count: number;
  status: string;
  created_at: string;
}

export interface RunDetail {
  id: string;
  strategy: string;
  original_prompt: string;
  generator: string;
  evaluator?: string | null;
  status: string;
  iterations: IterationEvent[];
  score_history: number[];
  created_at: string;
  completed_at?: string | null;
}

export interface AvailableModelsResponse {
  providers: string[];
  models: Record<string, string[]>;
}
