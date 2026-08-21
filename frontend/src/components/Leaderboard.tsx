import { useState } from "react";
import type { RoundResult } from "../types/domain";
import { useCountUp } from "../hooks/useCountUp";

export default function Leaderboard({ history }: { history: RoundResult[] }) {
  const [desc, setDesc] = useState(true);
  const ranked = [...history].sort((a, b) => (a.score - b.score) * (desc ? -1 : 1));

  return (
    <div className="rounded-md border-2 border-hud-amber bg-chrome p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-xs text-hud-amber">🏆 ROUND RANKING</h3>
        <button
          type="button"
          onClick={() => setDesc((d) => !d)}
          className="rounded-sm border border-hud-amber px-2 py-1 text-[11px] text-hud-amber hover:bg-hud-amber hover:text-chrome-dark"
        >
          {desc ? "HIGH → LOW" : "LOW → HIGH"}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {ranked.map((round, i) => (
          <LeaderboardRow key={round.round} round={round} rank={i + 1} isWinner={desc && i === 0} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ round, rank, isWinner }: { round: RoundResult; rank: number; isWinner: boolean }) {
  const displayScore = useCountUp(round.score);

  return (
    <div
      className="flex items-center justify-between rounded-sm border-b border-chrome-border px-2 py-2 last:border-0"
      style={isWinner ? { boxShadow: "0 0 14px 2px rgba(255,184,77,0.35)" } : undefined}
    >
      <div className="flex items-center gap-3">
        <span className="font-pixel text-[10px] text-hud-text-dim">{isWinner ? "👑" : `#${rank}`}</span>
        <span className="font-mono text-sm text-hud-text">Round {round.round}</span>
      </div>
      <span
        className="font-mono text-sm font-semibold"
        style={{ color: isWinner ? "var(--color-hud-amber)" : "var(--color-hud-text)" }}
      >
        {displayScore}/100
      </span>
    </div>
  );
}
