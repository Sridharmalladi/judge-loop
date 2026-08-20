import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HudBar from "../components/HudBar";
import StepCard from "../components/StepCard";
import ProgressTrack from "../components/ProgressTrack";
import { usePipelineRun } from "../hooks/usePipelineRun";
import { ARENA_MODELS } from "../hooks/mockContent";

export default function PipelineRunPage({ variant }: { variant: "self_refine" | "prompt_optimization" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prompt = (location.state as { prompt?: string } | null)?.prompt;

  useEffect(() => {
    if (!prompt) navigate("/");
  }, [prompt, navigate]);

  const state = usePipelineRun({ prompt: prompt ?? "", variant, maxRounds: 4 });
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const currentScore = state.history[state.history.length - 1]?.score ?? null;

  if (!prompt) return null;

  const selectedSnapshot = selectedRound != null ? state.history.find((h) => h.round === selectedRound) : null;
  const stepsToShow = selectedSnapshot ? selectedSnapshot.steps : state.steps;

  return (
    <div>
      <HudBar
        mode={variant}
        model={ARENA_MODELS[0].name}
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

        {state.isDone && (
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
