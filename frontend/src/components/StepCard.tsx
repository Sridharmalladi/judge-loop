import { motion, AnimatePresence } from "framer-motion";
import type { StepState } from "../types/domain";
import { STEP_LABELS, STEP_SUBTITLES } from "../types/domain";
import ScoreRadar from "./ScoreRadar";
import ExpandableText from "./ExpandableText";

const STATUS_COLOR: Record<StepState["status"], string> = {
  locked: "var(--color-hud-text-dim)",
  active: "var(--color-hud-green)",
  complete: "var(--color-hud-cyan)",
};

export default function StepCard({ step }: { step: StepState }) {
  const color = STATUS_COLOR[step.status];

  return (
    <motion.div
      layout
      className="rounded-md border-2 bg-chrome p-4"
      animate={{
        borderColor: color,
        boxShadow: step.status === "active" ? `0 0 16px 2px ${color}55` : "0 0 0 0 transparent",
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] tracking-wide" style={{ color }}>
          {STEP_LABELS[step.kind]}
        </span>
        <StatusBadge status={step.status} color={color} />
      </div>
      <p className="mt-2 text-xs text-hud-text-dim">{STEP_SUBTITLES[step.kind]}</p>

      <AnimatePresence mode="wait">
        {step.status === "locked" && (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 text-hud-text-dim"
          >
            <LockIcon />
            <span className="text-xs">waiting…</span>
          </motion.div>
        )}

        {step.status !== "locked" && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3"
          >
            {step.kind === "evaluation" && step.scores ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <ScoreRadar dims={step.scores} />
              </motion.div>
            ) : (
              <ExpandableText text={step.content} cursor={step.status === "active"} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status, color }: { status: StepState["status"]; color: string }) {
  if (status === "complete") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm text-[10px]" style={{ background: color, color: "#0b0c12" }}>
        ✓
      </span>
    );
  }
  if (status === "active") {
    return <span className="h-2.5 w-2.5 animate-pulse-glow rounded-full" style={{ background: color, color }} />;
  }
  return <LockIcon small />;
}

function LockIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="7" width="10" height="7" fill="currentColor" opacity="0.6" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
