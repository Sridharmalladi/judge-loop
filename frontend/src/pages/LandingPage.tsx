import { useNavigate } from "react-router-dom";
import SourceTabs from "../components/SourceTabs";
import type { RunSource } from "../types/domain";

export default function LandingPage() {
  const navigate = useNavigate();

  function pick(source: RunSource) {
    navigate("/start", { state: { source } });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1
        className="font-pixel text-2xl text-hud-green sm:text-4xl"
        style={{ textShadow: "0 0 20px var(--color-hud-green)" }}
      >
        JUDGE LOOP
      </h1>
      <p
        className="mt-4 max-w-xl text-sm leading-relaxed text-hud-text sm:text-base"
        style={{
          textShadow:
            "0 0 6px var(--color-chrome-dark), 0 0 10px var(--color-chrome-dark), 0 0 16px var(--color-hud-cyan)",
        }}
      >
        Watch an LLM improve its own answer, round after round. It writes, gets judged, revises, and tries again.
        Every round is scored on relevance, coherence, completeness, conciseness, accuracy, and creativity, so you
        can see exactly where it's getting better, and where it still isn't.
      </p>
      <p
        className="mt-3 max-w-xl text-xs leading-relaxed text-hud-text-dim"
        style={{ textShadow: "0 0 6px var(--color-chrome-dark), 0 0 10px var(--color-chrome-dark)" }}
      >
        Coming next: real prompt optimization, where the instructions themselves evolve across a whole set of test
        cases, not just one answer at a time.
      </p>
      <p className="mt-8 text-xs uppercase tracking-wide text-hud-text-dim">
        Hover over a mode to see what it does, then pick one to get started
      </p>
      <div className="mt-4">
        <SourceTabs selected={null} onSelect={pick} />
      </div>
    </div>
  );
}
