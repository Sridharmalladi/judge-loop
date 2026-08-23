import { useEffect, useState } from "react";
import { getModels, getModelCatalog, type AvailableModelsResponse } from "../lib/api";

// The backend is a Render free-tier service — it spins down after 15 minutes
// idle and takes 30-50s to wake back up. A single failed fetch during that
// window used to strand the user on a permanent "unavailable" state until
// they manually refreshed and got lucky with timing. Retrying with backoff
// covers a typical cold start so the page recovers on its own.
const RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 8000, 8000, 8000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// `real` mode wants the server's own available models (reliability-ranked,
// only what the server has keys for). `byok` mode wants the full catalog —
// the server's key situation is irrelevant when the caller brings their own.
export function useLiveModels(source: "real" | "byok" = "real") {
  const [data, setData] = useState<AvailableModelsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWakingUp(false);
    setData(null);
    setError(null);
    const fetcher = source === "byok" ? getModelCatalog : getModels;

    async function run() {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          const d = await fetcher();
          if (!cancelled) {
            setData(d);
            setLoading(false);
            setWakingUp(false);
          }
          return;
        } catch (e) {
          if (cancelled) return;
          if (attempt === RETRY_DELAYS_MS.length) {
            setError(String((e as Error).message ?? e));
            setLoading(false);
            setWakingUp(false);
            return;
          }
          // First failure could just be a cold start — only call it out once
          // it's actually taken a couple of retries to confirm the pattern.
          if (attempt >= 1) setWakingUp(true);
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [source]);

  return { data, error, loading, wakingUp };
}
