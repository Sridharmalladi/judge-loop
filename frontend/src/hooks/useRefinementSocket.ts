import { useCallback, useState } from "react";
import { WS_URL } from "../api";
import type { IterationEvent, RunCompleteEvent, StartRunRequest, WsInboundMessage } from "../types";

export type SocketPhase = "idle" | "connecting" | "running" | "complete" | "error";

interface RefinementSocketState {
  phase: SocketPhase;
  runId: string | null;
  generator: string | null;
  evaluator: string | null;
  maxIterations: number | null;
  iterations: IterationEvent[];
  complete: RunCompleteEvent | null;
  error: string | null;
}

const initialState: RefinementSocketState = {
  phase: "idle",
  runId: null,
  generator: null,
  evaluator: null,
  maxIterations: null,
  iterations: [],
  complete: null,
  error: null,
};

export function useRefinementSocket() {
  const [state, setState] = useState<RefinementSocketState>(initialState);

  // Returns the live WebSocket so the caller's effect can own its lifecycle
  // (create + close in the same effect) — required to stay StrictMode-safe.
  // Splitting creation from cleanup across effects means React's dev-only
  // double-invoke closes the socket right after opening it.
  const start = useCallback((req: StartRunRequest): WebSocket => {
    setState({ ...initialState, phase: "connecting" });

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify(req));
    };

    ws.onmessage = (evt) => {
      const msg: WsInboundMessage = JSON.parse(evt.data);

      if (msg.type === "status") {
        setState((s) => ({
          ...s,
          phase: "running",
          runId: msg.run_id,
          generator: msg.generator,
          evaluator: msg.evaluator ?? null,
          maxIterations: msg.max_iterations,
        }));
      } else if (msg.type === "iteration") {
        setState((s) => ({
          ...s,
          phase: "running",
          iterations: [...s.iterations, msg],
        }));
      } else if (msg.type === "complete") {
        setState((s) => ({ ...s, phase: "complete", complete: msg }));
      } else if (msg.type === "error") {
        setState((s) => ({ ...s, phase: "error", error: msg.error }));
      }
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, phase: "error", error: "WebSocket connection failed" }));
    };

    ws.onclose = () => {
      setState((s) => (s.phase === "running" ? { ...s, phase: "error", error: "Connection closed unexpectedly" } : s));
    };

    return ws;
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { state, start, reset };
}
