import { useEffect, useRef } from "react";
import type { TickerEntry } from "../types/domain";

const TONE_COLOR: Record<TickerEntry["tone"], string> = {
  info: "var(--color-hud-text-dim)",
  good: "var(--color-hud-green)",
  bad: "var(--color-hud-pink)",
};

export default function EventTicker({ entries }: { entries: TickerEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div className="fixed left-3 top-28 bottom-6 z-[25] flex w-56 flex-col rounded-md border-2 border-chrome-border bg-chrome-dark/95 backdrop-blur-sm">
      <p className="flex-shrink-0 border-b-2 border-chrome-border px-3 py-2 font-pixel text-[9px] text-hud-text-dim">
        ACTIVITY LOG
      </p>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-snug">
        {entries.map((e) => (
          <p key={e.id} className="flex items-start gap-2 py-1" style={{ color: TONE_COLOR[e.tone] }}>
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: TONE_COLOR[e.tone] }} />
            <span>{e.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
