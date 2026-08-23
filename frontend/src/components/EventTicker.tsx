import { useEffect, useRef } from "react";
import type { TickerEntry } from "../types/domain";

const TONE_COLOR: Record<TickerEntry["tone"], string> = {
  info: "var(--color-hud-text-dim)",
  good: "var(--color-hud-green)",
  bad: "var(--color-hud-pink)",
};

// Content column is max-w-5xl (1024px), centered — the left gutter is
// whatever's left of (100vw - 1024px) / 2. Center this box within that
// gutter rather than pinning it to the viewport edge; floor at 0.75rem so
// it never goes negative (overlapping content) on narrower viewports.
const CENTER_IN_GUTTER = "max(0.75rem, calc((100vw - 1024px) / 4 - 5.5rem))";

export default function EventTicker({ entries }: { entries: TickerEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      className="fixed top-28 z-[25] flex max-h-56 w-44 flex-col rounded-md border-2 border-chrome-border bg-chrome-dark/95 backdrop-blur-sm"
      style={{ left: CENTER_IN_GUTTER }}
    >
      <p className="flex-shrink-0 border-b-2 border-chrome-border px-2 py-1.5 font-pixel text-[8px] text-hud-text-dim">
        ACTIVITY LOG
      </p>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 font-mono text-[10px] leading-snug">
        {entries.map((e) => (
          <p key={e.id} className="flex items-start gap-1.5 py-0.5" style={{ color: TONE_COLOR[e.tone] }}>
            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full" style={{ background: TONE_COLOR[e.tone] }} />
            <span>{e.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
