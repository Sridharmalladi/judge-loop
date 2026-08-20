export const API_BASE = "http://localhost:8000";
export const WS_URL = "ws://localhost:8000/ws/refine";

export interface AvailableModelsResponse {
  providers: string[];
  models: Record<string, string[]>;
}

export async function getModels(): Promise<AvailableModelsResponse> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
