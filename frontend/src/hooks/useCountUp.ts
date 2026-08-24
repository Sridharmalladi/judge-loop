import { useEffect, useRef, useState } from "react";

// Animates a displayed number toward `value` instead of snapping —
// used for score readouts so a jump from e.g. 62 to 88 reads as a climb.
export function useCountUp(value: number, durationMs = 500): number {
  // Leaderboard only mounts once a run is already finished, with the final
  // score as the very first value it's ever given — seeding both refs at
  // `value` meant `from === value` on that first render, so the animation
  // never ran at all; it starts from 0 instead.
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    // Only cancel the in-flight frame here — do NOT also snap fromRef to
    // `value`. In dev, StrictMode runs this cleanup once immediately after
    // the effect above as a resilience check, before a single frame has
    // fired; forcing fromRef to the target right there made `from === value`
    // true on the very next effect run, so the "real" run bailed out with
    // the same never-animates bug this hook was just fixed for. Advancing
    // fromRef is already handled correctly above, in tick's own t>=1 branch.
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return Math.round(display);
}
