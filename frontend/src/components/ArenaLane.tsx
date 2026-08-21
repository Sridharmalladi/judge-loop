import { motion } from "framer-motion";
import type { ModelLaneState } from "../types/domain";
import { useCountUp } from "../hooks/useCountUp";

export default function ArenaLane({ lane, isWinner }: { lane: ModelLaneState; isWinner?: boolean }) {
  const pct = lane.score ?? (lane.status === "generating" ? 35 : lane.status === "evaluating" ? 70 : 0);
  const displayScore = useCountUp(lane.score ?? 0);

  return (
    <div
      className="rounded-md border-2 bg-chrome p-4 transition-shadow"
      style={{
        borderColor: isWinner ? lane.colorVar : "var(--color-chrome-border)",
        color: lane.colorVar,
        boxShadow: isWinner ? "0 0 18px 3px currentColor" : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: lane.colorVar }} />
          <span className="font-pixel text-[10px]" style={{ color: lane.colorVar }}>
            {isWinner ? "👑 " : ""}
            {lane.name}
          </span>
        </div>
        <span className="text-xs uppercase tracking-wide text-hud-text-dim">{lane.status}</span>
      </div>

      <p className="mt-3 h-16 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-relaxed text-hud-text">
        {lane.text || "waiting to start…"}
      </p>

      <div className="relative mt-3 h-4 overflow-hidden rounded-sm border border-chrome-border bg-chrome-dark">
        <motion.div
          className="h-full"
          style={{ background: lane.colorVar }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
        {lane.status === "finished" && (
          <span className="absolute inset-y-0 right-1 flex items-center font-pixel text-[8px] text-chrome-dark">
            🏁
          </span>
        )}
      </div>
      {lane.score != null && (
        <p className="mt-2 text-right font-mono text-sm font-semibold" style={{ color: lane.colorVar }}>
          {displayScore}/100
        </p>
      )}
    </div>
  );
}
