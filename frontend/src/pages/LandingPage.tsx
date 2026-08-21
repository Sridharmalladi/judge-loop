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
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-hud-text-dim sm:text-base">
        Watch an LLM improve its own answer, round after round — generate, get judged, revise, repeat. Every round
        is scored on relevance, coherence, completeness, conciseness, accuracy, and creativity, so you can watch
        exactly where it's improving, and where it isn't.
      </p>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-hud-text-dim">
        Next up: real prompt optimization — evolving the instructions themselves across a whole test set, not just
        one answer at a time.
      </p>
      <p className="mt-8 text-xs uppercase tracking-wide text-hud-text-dim">
        Hover a mode to see what it does, then pick one
      </p>
      <div className="mt-4">
        <SourceTabs selected={null} onSelect={pick} />
      </div>
    </div>
  );
}
