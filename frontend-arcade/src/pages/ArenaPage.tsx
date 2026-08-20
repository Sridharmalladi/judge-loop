import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HudBar from "../components/HudBar";
import ArenaLane from "../components/ArenaLane";
import Leaderboard from "../components/Leaderboard";
import { useArenaRun } from "../hooks/useArenaRun";

export default function ArenaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prompt = (location.state as { prompt?: string } | null)?.prompt;

  useEffect(() => {
    if (!prompt) navigate("/");
  }, [prompt, navigate]);

  const state = useArenaRun(prompt ?? "");

  if (!prompt) return null;

  return (
    <div>
      <HudBar
        mode="cross_model"
        model={`${state.lanes.length} models`}
        elapsedMs={Math.max(0, ...state.lanes.map((l) => l.elapsedMs ?? 0))}
        tokenCount={0}
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-md border-2 border-chrome-border bg-chrome p-4">
          <p className="text-xs uppercase tracking-wide text-hud-text-dim">Prompt</p>
          <p className="mt-1 font-mono text-sm text-hud-text">{prompt}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {state.lanes.map((lane) => (
            <ArenaLane key={lane.id} lane={lane} />
          ))}
        </div>

        {state.isDone && (
          <div className="mt-6">
            <Leaderboard lanes={state.lanes} />
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-sm border-2 border-hud-green px-4 py-2 font-pixel text-[10px] text-hud-green hover:bg-hud-green hover:text-chrome-dark"
            >
              NEW RUN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
