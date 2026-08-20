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

  useEffect(() => {
    if (modelsData && modelsData.providers.length > 0 && !provider) {
      const first = modelsData.providers[0];
      setProvider(first);
      setModel(modelsData.models[first]?.[0] ?? "");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [modelsData]);

  const canRunReal = Boolean(provider && model && !modelsError);

  function go(mode: RunMode) {
    const cleanPrompt = prompt.trim() || DEMO_PROMPTS[0];
    if (mode === "cross_model") {
      navigate(ROUTES[mode], { state: { prompt: cleanPrompt } });
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

      <div className="mx-auto mb-10 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
        <label className="mb-2 block text-xs uppercase tracking-wide text-hud-text-dim">
          Model — for Self-Refine / Prompt Opt (real API calls)
        </label>
        {modelsLoading && <p className="text-sm text-hud-text-dim">Connecting to backend…</p>}
        {modelsError && (
          <p className="text-sm text-hud-pink">
            Backend unreachable at localhost:8000 — is it running? Self-Refine and Prompt Opt need it; Cross-Model
            still works (simulated).
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <TrackSelectCard
          title="SELF-REFINE"
          description="One model generates, judges its own work, and rewrites — round after round."
          accent="var(--color-hud-green)"
          icon={<CarIcon />}
          onSelect={() => go("self_refine")}
        />
        <TrackSelectCard
          title="CROSS-MODEL"
          description="Several models race the same prompt side by side. Best score wins. (Simulated demo.)"
          accent="var(--color-hud-cyan)"
          icon={<FlagIcon />}
          onSelect={() => go("cross_model")}
        />
        <TrackSelectCard
          title="PROMPT OPT"
          description="Instead of the answer, the instructions themselves evolve each round."
          accent="var(--color-hud-pink)"
          icon={<GearIcon />}
          onSelect={() => go("prompt_optimization")}
        />
      </div>

      <p
        className="mt-10 text-center text-[11px] text-hud-text-dim"
        style={{ textShadow: "0 0 6px var(--color-chrome-dark), 0 0 6px var(--color-chrome-dark)" }}
      >
        Self-Refine and Prompt Opt call real models through your backend. Cross-Model is a simulated demo.
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
