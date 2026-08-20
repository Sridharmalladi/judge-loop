import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ScoreChart({ scores }: { scores: number[] }) {
  const data = scores.map((score, idx) => ({
    iteration: idx + 1,
    score,
  }));

  if (data.length === 0) {
    return <div className="empty-state">NO DATA YET</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#2a5d34" strokeDasharray="2 4" />
        <XAxis
          dataKey="iteration"
          stroke="#6fa87d"
          tick={{ fill: "#6fa87d", fontFamily: "VT323", fontSize: 14 }}
          label={{ value: "ITERATION", position: "insideBottom", offset: -2, fill: "#6fa87d", fontSize: 12 }}
        />
        <YAxis
          domain={[0, 10]}
          stroke="#6fa87d"
          tick={{ fill: "#6fa87d", fontFamily: "VT323", fontSize: 14 }}
        />
        <Tooltip
          contentStyle={{
            background: "#0f1810",
            border: "2px solid #3ddc5b",
            fontFamily: "VT323",
            fontSize: 16,
            color: "#c8f7d0",
          }}
          labelFormatter={(v) => `Iteration ${v}`}
          formatter={(v) => [Number(v).toFixed(2), "Score"]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3ddc5b"
          strokeWidth={2}
          dot={{ r: 4, fill: "#3ddc5b" }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
