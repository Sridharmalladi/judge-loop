function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const MODE_LABELS: Record<string, string> = {
  self_refine: "SELF-REFINE",
  cross_model: "CROSS-MODEL",
  prompt_optimization: "PROMPT OPT",
};

export default function HudBar({
  mode,
  model,
  round,
  maxRounds,
  elapsedMs,
  tokenCount,
  score,
}: {
  mode: string;
  model: string;
  round?: number;
  maxRounds?: number;
  elapsedMs: number;
  tokenCount: number;
  score?: number | null;
}) {
  return (
    <div className="sticky top-11 z-20 border-b-2 border-chrome-border bg-chrome-dark/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <HudStat label="MODE" value={MODE_LABELS[mode] ?? mode} color="var(--color-hud-cyan)" />
          <HudStat label="MODEL" value={model} color="var(--color-hud-text)" />
          {round !== undefined && (
            <HudStat label="ROUND" value={`${round}/${maxRounds}`} color="var(--color-hud-amber)" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <HudStat label="ELAPSED" value={formatElapsed(elapsedMs)} color="var(--color-hud-text)" />
          <HudStat label="TOKENS" value={tokenCount.toLocaleString()} color="var(--color-hud-text)" />
          {score != null && <HudStat label="SCORE" value={String(score)} color="var(--color-hud-green)" />}
        </div>
      </div>
    </div>
  );
}

function HudStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-hud-text-dim tracking-wide">{label}</span>
      <span className="font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
