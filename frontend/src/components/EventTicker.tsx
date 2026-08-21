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
    <div className="fixed inset-x-0 bottom-0 z-[25] border-t-2 border-chrome-border bg-chrome-dark/95 backdrop-blur-sm">
      <div ref={scrollRef} className="mx-auto max-h-24 max-w-5xl overflow-y-auto px-4 py-2 font-mono text-[11px]">
        {entries.map((e) => (
          <p key={e.id} className="flex items-center gap-2 py-0.5" style={{ color: TONE_COLOR[e.tone] }}>
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: TONE_COLOR[e.tone] }} />
            <span className="truncate">{e.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
