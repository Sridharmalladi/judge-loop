export default function CritiquePanel({
  critique,
  strengths,
  weaknesses,
  suggestions,
}: {
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}) {
  return (
    <div>
      {critique && <p className="critique-text">"{critique}"</p>}
      <div className="critique-grid">
        <div className="critique-col strengths">
          <h4>+ Strengths</h4>
          <ul>
            {strengths.length ? strengths.map((s, i) => <li key={i}>{s}</li>) : <li>—</li>}
          </ul>
        </div>
        <div className="critique-col weaknesses">
          <h4>- Weaknesses</h4>
          <ul>
            {weaknesses.length ? weaknesses.map((s, i) => <li key={i}>{s}</li>) : <li>—</li>}
          </ul>
        </div>
        <div className="critique-col suggestions">
          <h4>~ Suggestions</h4>
          <ul>
            {suggestions.length ? suggestions.map((s, i) => <li key={i}>{s}</li>) : <li>—</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
