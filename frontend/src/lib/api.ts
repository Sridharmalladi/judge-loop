// VITE_API_BASE_URL is a build-time env var (set in Netlify's site config,
// or a local .env file) — falls back to localhost for dev. WS_URL is
// derived from it, not set separately, so the two can never drift.
const rawBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const API_BASE = rawBase.replace(/\/$/, "");
export const WS_URL = API_BASE.replace(/^http/, "ws") + "/ws/refine";

export interface AvailableModelsResponse {
  providers: string[];
  models: Record<string, string[]>;
}

export async function getModels(): Promise<AvailableModelsResponse> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
