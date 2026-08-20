import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRun } from "../api";
import ScoreBar from "../components/ScoreBar";
import ScoreChart from "../components/ScoreChart";
import DiffView from "../components/DiffView";
import CritiquePanel from "../components/CritiquePanel";
import type { RunDetail } from "../types";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRun(id)
      .then(setRun)
      .catch((e) => setError(String(e.message ?? e)));
  }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!run) return <div className="empty-state">LOADING…</div>;

  return (
    <div>
      <div className="panel">
        <h3 className="panel-title">RUN {run.id.slice(0, 8)}</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 16 }}>
          Strategy: <strong style={{ color: "var(--text)" }}>{run.strategy}</strong> · Generator:{" "}
          <strong style={{ color: "var(--text)" }}>{run.generator}</strong>
          {run.evaluator && (
            <>
              {" "}
              · Evaluator: <strong style={{ color: "var(--text)" }}>{run.evaluator}</strong>
            </>
          )}
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: 16 }}>
          <span className={`status-pill status-${run.status}`}>{run.status}</span>{" "}
          · {new Date(run.created_at).toLocaleString()}
        </p>
        <div className="response-text" style={{ maxHeight: 120 }}>
          {run.original_prompt}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">SCORE PROGRESSION</h3>
        <ScoreChart scores={run.score_history} />
      </div>

      {run.iterations.length >= 2 && (
        <div className="panel">
          <h3 className="panel-title">
            DIFF — FIRST → FINAL
          </h3>
          <DiffView before={run.iterations[0].response} after={run.iterations[run.iterations.length - 1].response} />
        </div>
      )}

      {[...run.iterations].reverse().map((it) => (
        <div key={it.iteration_number} className={`iteration-card ${it.is_final ? "is-final" : ""}`}>
          <div className="iteration-header">
            <span>
              ITERATION {it.iteration_number} · {it.model_used} · {it.latency_ms.toFixed(0)}ms
            </span>
            {it.is_final && <span className="badge">FINAL</span>}
          </div>
          <ScoreBar score={it.score} label={`ITER ${it.iteration_number}`} />
          <div className="response-text">{it.response}</div>
          <CritiquePanel
            critique={it.critique}
            strengths={it.strengths}
            weaknesses={it.weaknesses}
            suggestions={it.suggestions}
          />
        </div>
      ))}
    </div>
  );
}
