import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HudBar from "../components/HudBar";
import StepCard from "../components/StepCard";
import ProgressTrack from "../components/ProgressTrack";
import { useRealPipelineRun } from "../hooks/useRealPipelineRun";

interface RunState {
  prompt?: string;
  provider?: string;
  model?: string;
}

export default function PipelineRunPage({ variant }: { variant: "self_refine" | "prompt_optimization" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { prompt, provider, model } = (location.state as RunState | null) ?? {};

  useEffect(() => {
    if (!prompt || !provider || !model) navigate("/");
  }, [prompt, provider, model, navigate]);

  const { state, error, generatorLabel } = useRealPipelineRun({
    prompt: prompt ?? "",
    strategy: variant,
    provider: provider ?? "",
    model: model ?? "",
    maxRounds: 4,
  });
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const currentScore = state.history[state.history.length - 1]?.score ?? null;

  if (!prompt || !provider || !model) return null;

  const selectedSnapshot = selectedRound != null ? state.history.find((h) => h.round === selectedRound) : null;
  const stepsToShow = selectedSnapshot ? selectedSnapshot.steps : state.steps;

  return (
    <div>
      <HudBar
        mode={variant}
        model={generatorLabel}
        round={state.round}
        maxRounds={state.maxRounds}
        elapsedMs={state.elapsedMs}
        tokenCount={state.tokenCount}
        score={currentScore}
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <ProgressTrack
            round={state.round}
            maxRounds={state.maxRounds}
            history={state.history}
            selectedRound={selectedRound}
            onSelectRound={setSelectedRound}
          />
        </div>

        {error && (
          <div className="mb-6 rounded-md border-2 border-hud-pink bg-chrome p-4 text-center">
            <p className="font-pixel text-xs text-hud-pink">✕ ERROR</p>
            <p className="mt-2 text-sm text-hud-text-dim">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-sm border-2 border-hud-pink px-4 py-2 font-pixel text-[10px] text-hud-pink hover:bg-hud-pink hover:text-chrome-dark"
            >
              BACK
            </button>
          </div>
        )}

        {state.isDone && !error && (
          <div className="mb-6 rounded-md border-2 border-hud-green bg-chrome p-4 text-center">
            <p className="font-pixel text-xs text-hud-green">✓ FINISHED</p>
            <p className="mt-2 text-sm text-hud-text-dim">
              Score: {state.history[0]?.score} → {state.history[state.history.length - 1]?.score} over{" "}
              {state.history.length} rounds
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-sm border-2 border-hud-green px-4 py-2 font-pixel text-[10px] text-hud-green hover:bg-hud-green hover:text-chrome-dark"
            >
              NEW RUN
            </button>
          </div>
        )}

        {selectedSnapshot && (
          <div className="mb-4 flex items-center justify-between rounded-md border-2 border-hud-amber bg-chrome px-4 py-2">
            <span className="font-pixel text-[10px] text-hud-amber">
              REVIEWING ROUND {selectedSnapshot.round} — SCORE {selectedSnapshot.score}
            </span>
            <button
              onClick={() => setSelectedRound(null)}
              className="rounded-sm border border-hud-amber px-2 py-1 text-[11px] text-hud-amber hover:bg-hud-amber hover:text-chrome-dark"
            >
              clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {stepsToShow.map((step) => (
            <StepCard key={step.kind} step={step} />
          ))}
        </div>
      </div>
    </div>
  );
}
