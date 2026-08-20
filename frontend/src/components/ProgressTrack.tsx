import type { RoundResult } from "../types/domain";

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
  const rounds = Array.from({ length: maxRounds }, (_, i) => i + 1);
  const clickable = history.length > 0;

  return (
    <div className="rounded-md border-2 border-chrome-border bg-chrome p-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {rounds.map((r) => {
          const entry = history.find((h) => h.round === r);
          const done = !!entry;
          const isCurrent = r === round && !done;
          const isSelected = selectedRound === r;

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
              title={done ? `View round ${r}` : undefined}
              className="flex flex-col items-center justify-center gap-1 rounded-sm border-2 py-3 transition-all disabled:cursor-default"
              style={{
                borderColor,
                background: isSelected ? "var(--color-chrome-raised)" : "var(--color-chrome-dark)",
                boxShadow: isSelected ? "0 0 12px var(--color-hud-amber)" : isCurrent ? "0 0 8px var(--color-hud-amber)" : "none",
              }}
            >
              <span className="font-pixel text-[10px]" style={{ color: textColor }}>
                R{r}
              </span>
              <span className="font-mono text-xs" style={{ color: textColor }}>
                {done ? entry!.score : isCurrent ? "···" : "—"}
              </span>
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
            ? `Viewing round ${selectedRound} — click again, or "clear" to return to the latest.`
            : "Click a round to review its steps."}
        </p>
      )}
    </div>
  );
}
