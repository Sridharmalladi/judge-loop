import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrackSelectCard from "../components/TrackSelectCard";
import { DEMO_PROMPTS } from "../hooks/mockContent";
import type { RunMode } from "../types/domain";

const ROUTES: Record<RunMode, string> = {
  self_refine: "/run/self-refine",
  cross_model: "/run/arena",
  prompt_optimization: "/run/prompt-opt",
};

export default function StartScreen() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);

  function go(mode: RunMode) {
    navigate(ROUTES[mode], { state: { prompt: prompt.trim() || DEMO_PROMPTS[0] } });
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

      <div className="mx-auto mb-10 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
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
          description="Several models race the same prompt side by side. Best score wins."
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
        Simulated demo — token streams and scores are mocked, no live model calls.
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
