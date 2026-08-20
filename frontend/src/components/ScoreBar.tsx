function colorForScore(score: number): string {
  if (score >= 7.5) return "#3ddc5b";
  if (score >= 5) return "#ffb627";
  return "#ff4d4d";
}

export default function ScoreBar({
  score,
  max = 10,
  label = "SCORE",
}: {
  score: number;
  max?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = colorForScore(score);

  return (
    <div className="stat-bar-wrap">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color, color }}
        />
      </div>
      <span className="stat-bar-value" style={{ color }}>
        {score.toFixed(1)}/{max}
      </span>
    </div>
  );
}
