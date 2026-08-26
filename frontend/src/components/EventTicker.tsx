import { useEffect, useRef } from "react";
import type { TickerEntry } from "../types/domain";

const TONE_COLOR: Record<TickerEntry["tone"], string> = {
  info: "var(--color-hud-text-dim)",
  good: "var(--color-hud-green)",
  bad: "var(--color-hud-pink)",
};

// Content column is max-w-5xl (1024px), centered — the left gutter is
// whatever's left of (100vw - 1024px) / 2. Center this box (w-36 = 9rem)
// within that gutter: box's left edge = gutter_start + (gutter_width -
// box_width) / 2, which reduces to (100vw - 1024px) / 4 - 4.5rem.
//
// There's no floor on this — a floor can only push the box toward the
// viewport edge, it can't stop it from also overlapping the content column
// once the gutter gets narrower than the box, which is exactly the "stuck
// in the corner, on top of everything" look this was meant to fix. Below
// 1024 + 2*(box_width + a little breathing room) ≈ 1320px of viewport
// width, the gutter is genuinely too narrow to hold the box without
// covering real content, so the component hides itself entirely instead
// (see the [@media] guard below) rather than show something broken.
const CENTER_IN_GUTTER = "calc((100vw - 1024px) / 4 - 4.5rem)";

export default function EventTicker({ entries }: { entries: TickerEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      className="fixed top-28 z-[25] hidden max-h-56 w-36 flex-col rounded-md border-2 border-chrome-border bg-chrome-dark/95 backdrop-blur-sm [@media(min-width:1320px)]:flex"
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
