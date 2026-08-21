import type { ModelLaneState } from "../types/domain";
import { useCountUp } from "../hooks/useCountUp";

export default function Leaderboard({ lanes }: { lanes: ModelLaneState[] }) {
  const ranked = [...lanes].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="rounded-md border-2 border-hud-amber bg-chrome p-4">
      <h3 className="font-pixel text-xs text-hud-amber">🏆 HIGH SCORES</h3>
      <div className="mt-4 flex flex-col gap-2">
        {ranked.map((lane, i) => (
          <LeaderboardRow key={lane.id} lane={lane} rank={i + 1} isWinner={i === 0} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ lane, rank, isWinner }: { lane: ModelLaneState; rank: number; isWinner: boolean }) {
  const displayScore = useCountUp(lane.score ?? 0);

  return (
    <div
      className="flex items-center justify-between rounded-sm border-b border-chrome-border px-2 py-2 last:border-0"
      style={isWinner ? { boxShadow: `0 0 14px 2px ${lane.colorVar}55` } : undefined}
    >
      <div className="flex items-center gap-3">
        <span className="font-pixel text-[10px] text-hud-text-dim">
          {isWinner ? "👑" : `#${rank}`}
        </span>
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lane.colorVar }} />
        <span className="font-mono text-sm text-hud-text">{lane.name}</span>
      </div>
      <span className="font-mono text-sm font-semibold" style={{ color: lane.colorVar }}>
        {displayScore}/100
      </span>
    </div>
  );
}
