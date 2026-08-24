import { memo } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { ScoreDimension } from "../types/domain";

// Both call sites (the round-tile hover popup, the live evaluation card)
// sit under a tree that re-renders every ~100ms while a run is active (the
// elapsed-time ticker) plus on every streamed character elsewhere on the
// page. Recharts rebuilds its whole SVG on each render regardless of
// whether `dims` actually changed, which read as the chart flickering
// mid-run. `dims` is a stable array reference once a round's score lands
// (see revealIteration in useRealPipelineRun), so memoizing here is enough
// to skip the rebuild on every unrelated re-render upstream.
function ScoreRadar({ dims }: { dims: ScoreDimension[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={dims} outerRadius="75%">
        <PolarGrid stroke="#34364a" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: "#d8daf0", fontFamily: "JetBrains Mono", fontSize: 11 }}
        />
        <Radar
          dataKey="value"
          stroke="var(--color-hud-green)"
          fill="var(--color-hud-green)"
          fillOpacity={0.25}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default memo(ScoreRadar);
