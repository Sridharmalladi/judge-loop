import type { ModelLaneState } from "../types/domain";

export default function Leaderboard({ lanes }: { lanes: ModelLaneState[] }) {
  const ranked = [...lanes].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="rounded-md border-2 border-hud-amber bg-chrome p-4">
      <h3 className="font-pixel text-xs text-hud-amber">🏆 HIGH SCORES</h3>
      <div className="mt-4 flex flex-col gap-2">
        {ranked.map((lane, i) => (
          <div key={lane.id} className="flex items-center justify-between border-b border-chrome-border pb-2 last:border-0">
            <div className="flex items-center gap-3">
              <span className="font-pixel text-[10px] text-hud-text-dim">#{i + 1}</span>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lane.colorVar }} />
              <span className="font-mono text-sm text-hud-text">{lane.name}</span>
            </div>
            <span className="font-mono text-sm font-semibold" style={{ color: lane.colorVar }}>
              {lane.score}/100
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
