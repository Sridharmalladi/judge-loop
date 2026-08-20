import type { AvailableModelsResponse, RunDetail, RunSummary } from "./types";

export const API_BASE = "http://localhost:8000";
export const WS_URL = "ws://localhost:8000/ws/refine";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export function getModels(): Promise<AvailableModelsResponse> {
  return fetch(`${API_BASE}/api/models`).then((r) => handle(r));
}

export function listRuns(limit = 20, offset = 0): Promise<RunSummary[]> {
  return fetch(`${API_BASE}/api/runs?limit=${limit}&offset=${offset}`).then((r) => handle(r));
}

export function getRun(id: string): Promise<RunDetail> {
  return fetch(`${API_BASE}/api/runs/${id}`).then((r) => handle(r));
}

export function deleteRun(id: string): Promise<{ deleted: boolean }> {
  return fetch(`${API_BASE}/api/runs/${id}`, { method: "DELETE" }).then((r) => handle(r));
}
