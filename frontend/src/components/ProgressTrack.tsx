import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RoundResult, ScoreDimension } from "../types/domain";
import ScoreRadar from "./ScoreRadar";

function roundScores(entry: RoundResult): ScoreDimension[] | undefined {
  return entry.steps.find((s) => s.kind === "evaluation")?.scores;
}

export default function ProgressTrack({
  round,
  maxRounds,
  history,
  selectedRound,
  onSelectRound,
}: {
  round: number;
  maxRounds: number;
  history: RoundResult[];
  selectedRound: number | null;
  onSelectRound: (round: number | null) => void;
}) {
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);
  const rounds = Array.from({ length: maxRounds }, (_, i) => i + 1);
  const clickable = history.length > 0;
  const latestRound = history.length > 0 ? history[history.length - 1] : null;
  const isLatestNewBest =
    latestRound != null && history.every((h) => h.round === latestRound.round || h.score <= latestRound.score);

  return (
    <div className="rounded-md border-2 border-chrome-border bg-chrome p-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {rounds.map((r) => {
          const entry = history.find((h) => h.round === r);
          const done = !!entry;
          const isCurrent = r === round && !done;
          const isSelected = selectedRound === r;
          const isNewBest = done && isLatestNewBest && r === latestRound!.round;
          const dims = done ? roundScores(entry!) : undefined;

          const borderColor = isSelected
            ? "var(--color-hud-amber)"
            : done
              ? "var(--color-hud-green)"
              : isCurrent
                ? "var(--color-hud-amber)"
                : "var(--color-chrome-border)";
          const textColor = isSelected
            ? "var(--color-hud-amber)"
            : done
              ? "var(--color-hud-green)"
              : isCurrent
                ? "var(--color-hud-amber)"
                : "var(--color-hud-text-dim)";

          return (
            <button
              key={r}
              type="button"
              disabled={!done}
              onClick={() => onSelectRound(isSelected ? null : r)}
              onMouseEnter={() => done && setHoveredRound(r)}
              onMouseLeave={() => setHoveredRound(null)}
              title={done ? `View round ${r}` : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-sm border-2 py-3 transition-all disabled:cursor-default ${
                isNewBest && !isSelected ? "animate-pulse-glow" : ""
              }`}
              style={{
                borderColor,
                color: isNewBest ? "var(--color-hud-green)" : undefined,
                background: isSelected ? "var(--color-chrome-raised)" : "var(--color-chrome-dark)",
                boxShadow: isSelected ? "0 0 12px var(--color-hud-amber)" : isCurrent ? "0 0 8px var(--color-hud-amber)" : "none",
              }}
            >
              <span className="font-pixel text-[10px]" style={{ color: textColor }}>
                R{r}
                {isNewBest && !isSelected ? " ★" : ""}
              </span>
              <span className="font-mono text-xs" style={{ color: textColor }}>
                {done ? entry!.score : isCurrent ? "···" : "·"}
              </span>

              <AnimatePresence>
                {hoveredRound === r && dims && dims.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 top-full z-30 mt-2 w-96 -translate-x-1/2 cursor-default rounded-md border-2 bg-chrome p-2 text-left shadow-lg"
                    style={{ borderColor: "var(--color-hud-green)" }}
                  >
                    <p className="mb-1 text-center font-pixel text-[9px] text-hud-green">
                      ROUND {r} · {entry!.score}/100
                    </p>
                    <ScoreRadar dims={dims} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      {history.length > 0 && (
        <p className="mt-3 font-mono text-sm text-hud-text-dim">
          Score:{" "}
          {history.map((h, i) => (
            <span key={h.round}>
              <span className="text-hud-green">{h.score}</span>
              {i < history.length - 1 && " → "}
            </span>
          ))}
        </p>
      )}
      {clickable && (
        <p className="mt-2 text-[11px] text-hud-text-dim">
          {selectedRound
            ? `Viewing round ${selectedRound}. Click it again, or choose "clear" to jump back to the latest round.`
            : "Hover over a round to see its score breakdown, or click one to review its steps."}
        </p>
      )}
    </div>
  );
}
