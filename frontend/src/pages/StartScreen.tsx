import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TrackSelectCard from "../components/TrackSelectCard";
import { DEMO_PROMPTS } from "../hooks/mockContent";
import { useLiveModels } from "../hooks/useLiveModels";
import type { RunMode } from "../types/domain";

const ROUTES: Record<RunMode, string> = {
  self_refine: "/run/self-refine",
  cross_model: "/run/arena",
  prompt_optimization: "/run/prompt-opt",
};

export default function StartScreen() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const { data: modelsData, error: modelsError, loading: modelsLoading } = useLiveModels();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [evaluatorProvider, setEvaluatorProvider] = useState("");
  const [evaluatorModel, setEvaluatorModel] = useState("");

  useEffect(() => {
    if (modelsData && modelsData.providers.length > 0 && !provider) {
      const first = modelsData.providers[0];
      setProvider(first);
      setModel(modelsData.models[first]?.[0] ?? "");
      // Default the judge to a different provider when one's available, so
      // "cross-model" means something out of the box instead of a model
      // judging its own twin.
      const judgeProvider = modelsData.providers[1] ?? first;
      setEvaluatorProvider(judgeProvider);
      setEvaluatorModel(modelsData.models[judgeProvider]?.[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsData]);

  const canRunReal = Boolean(provider && model && !modelsError);
  const canRunArena = Boolean(canRunReal && evaluatorProvider && evaluatorModel);

  function go(mode: RunMode) {
    const cleanPrompt = prompt.trim() || DEMO_PROMPTS[0];
    if (mode === "cross_model") {
      if (!canRunArena) return;
      navigate(ROUTES[mode], { state: { prompt: cleanPrompt, provider, model, evaluatorProvider, evaluatorModel } });
      return;
    }
    if (!canRunReal) return;
    navigate(ROUTES[mode], { state: { prompt: cleanPrompt, provider, model } });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="font-pixel text-lg text-hud-green sm:text-2xl" style={{ textShadow: "0 0 16px var(--color-hud-green)" }}>
          JUDGE LOOP
        </h1>
        <p className="mt-3 text-sm text-hud-text-dim">
          Pick a track. Watch an LLM improve its own answer, lap after lap.
        </p>
      </header>

      <div className="mx-auto mb-6 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
        <label className="mb-2 block text-xs uppercase tracking-wide text-hud-text-dim">Your prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-sm border-2 border-chrome-border bg-chrome-dark p-3 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              className="rounded-sm border border-dashed border-chrome-border px-2 py-1 text-[11px] text-hud-text-dim hover:border-hud-cyan hover:text-hud-cyan"
            >
              {p.length > 42 ? p.slice(0, 42) + "…" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mb-6 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
        <label className="mb-2 block text-xs uppercase tracking-wide text-hud-text-dim">
          Model — generator (Self-Refine / Prompt Opt / Cross-Model)
        </label>
        {modelsLoading && <p className="text-sm text-hud-text-dim">Connecting to backend…</p>}
        {modelsError && (
          <p className="text-sm text-hud-pink">
            Backend unreachable at localhost:8000 — is it running? All three tracks call it for real.
          </p>
        )}
        {modelsData && modelsData.providers.length === 0 && (
          <p className="text-sm text-hud-pink">Backend has no provider API keys configured.</p>
        )}
        {modelsData && modelsData.providers.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value;
                setProvider(p);
                setModel(modelsData.models[p]?.[0] ?? "");
              }}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
            >
              {modelsData.providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
            >
              {(modelsData.models[provider] ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {modelsData && modelsData.providers.length > 0 && (
        <div className="mx-auto mb-10 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
          <label className="mb-2 block text-xs uppercase tracking-wide text-hud-text-dim">
            Judge model — for Cross-Model only
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={evaluatorProvider}
              onChange={(e) => {
                const p = e.target.value;
                setEvaluatorProvider(p);
                setEvaluatorModel(modelsData.models[p]?.[0] ?? "");
              }}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-pink"
            >
              {modelsData.providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={evaluatorModel}
              onChange={(e) => setEvaluatorModel(e.target.value)}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-pink"
            >
              {(modelsData.models[evaluatorProvider] ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <TrackSelectCard
          title="SELF-REFINE"
          description="One model generates, judges its own work, and rewrites — round after round."
          accent="var(--color-hud-green)"
          icon={<CarIcon />}
          onSelect={() => go("self_refine")}
          disabled={!canRunReal}
          disabledReason={modelsError ? "Backend unreachable" : "Waiting on model list from backend…"}
        />
        <TrackSelectCard
          title="CROSS-MODEL"
          description="One model answers, a different model judges it — feedback loops back for a sharper next round."
          accent="var(--color-hud-cyan)"
          icon={<FlagIcon />}
          onSelect={() => go("cross_model")}
          disabled={!canRunArena}
          disabledReason={modelsError ? "Backend unreachable" : "Waiting on model list from backend…"}
        />
        <TrackSelectCard
          title="PROMPT OPT"
          description="Instead of the answer, the instructions themselves evolve each round."
          accent="var(--color-hud-pink)"
          icon={<GearIcon />}
          onSelect={() => go("prompt_optimization")}
          disabled={!canRunReal}
          disabledReason={modelsError ? "Backend unreachable" : "Waiting on model list from backend…"}
        />
      </div>

      <p
        className="mt-10 text-center text-[11px] text-hud-text-dim"
        style={{ textShadow: "0 0 6px var(--color-chrome-dark), 0 0 6px var(--color-chrome-dark)" }}
      >
        All three tracks call real models through your backend — no simulated runs.
      </p>
    </div>
  );
}

function CarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="8" width="14" height="4" />
      <rect x="3" y="5" width="10" height="4" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="1" width="2" height="14" />
      <rect x="5" y="2" width="2" height="2" />
      <rect x="9" y="2" width="2" height="2" />
      <rect x="7" y="4" width="2" height="2" />
      <rect x="5" y="6" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="3" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      <rect x="12" y="7" width="3" height="2" />
      <rect x="5" y="5" width="6" height="6" />
    </svg>
  );
}
