import { useEffect, useState } from "react";
import { getModels, getModelCatalog, type AvailableModelsResponse } from "../lib/api";

// `real` mode wants the server's own available models (reliability-ranked,
// only what the server has keys for). `byok` mode wants the full catalog —
// the server's key situation is irrelevant when the caller brings their own.
export function useLiveModels(source: "real" | "byok" = "real") {
  const [data, setData] = useState<AvailableModelsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
    const fetcher = source === "byok" ? getModelCatalog : getModels;
    fetcher()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  return { data, error, loading };
}
