import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { ScoreDimension } from "../types/domain";

export default function ScoreRadar({ dims }: { dims: ScoreDimension[] }) {
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
