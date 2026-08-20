import { motion } from "framer-motion";
import type { ModelLaneState } from "../types/domain";

export default function ArenaLane({ lane }: { lane: ModelLaneState }) {
  const pct = lane.score ?? (lane.status === "generating" ? 35 : lane.status === "evaluating" ? 70 : 0);

  return (
    <div className="rounded-md border-2 border-chrome-border bg-chrome p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: lane.colorVar }} />
          <span className="font-pixel text-[10px]" style={{ color: lane.colorVar }}>
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
          {lane.score}/100
        </p>
      )}
    </div>
  );
}
