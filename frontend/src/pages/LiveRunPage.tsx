import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ScoreBar from "../components/ScoreBar";
import ScoreChart from "../components/ScoreChart";
import DiffView from "../components/DiffView";
import CritiquePanel from "../components/CritiquePanel";
import { useRefinementSocket } from "../hooks/useRefinementSocket";
import type { StartRunRequest } from "../types";

export default function LiveRunPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, start } = useRefinementSocket();

  const req = (location.state as { req?: StartRunRequest } | null)?.req;

  useEffect(() => {
    if (!req) {
      navigate("/");
      return;
    }
    const ws = start(req);
    return () => ws.close();
  }, [req, start, navigate]);

  if (!req) return null;

  const latest = state.iterations[state.iterations.length - 1];
  const previous = state.iterations[state.iterations.length - 2];

  return (
    <div>
      <div className="panel">
        <h3 className="panel-title">RUN CONFIG</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 16, margin: 0 }}>
          Strategy: <strong style={{ color: "var(--text)" }}>{req.strategy}</strong> · Generator:{" "}
          <strong style={{ color: "var(--text)" }}>{state.generator ?? `${req.generator_provider}/${req.generator_model}`}</strong>
          {state.evaluator && (
            <>
              {" "}
              · Evaluator: <strong style={{ color: "var(--text)" }}>{state.evaluator}</strong>
            </>
          )}
        </p>
        <p style={{ marginTop: 8 }}>
          Status:{" "}
          <span className={`status-pill status-${state.phase === "running" ? "running" : state.complete?.status ?? state.phase}`}>
            {state.phase === "running" && <span className="blink">●</span>} {state.phase.toUpperCase()}
          </span>
        </p>
      </div>

      {state.error && <div className="error-banner">{state.error}</div>}

      {state.iterations.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">SCORE PROGRESSION</h3>
          <ScoreChart scores={state.iterations.map((it) => it.score)} />
        </div>
      )}

      {state.complete && (
        <div className="panel">
          <h3 className="panel-title">{state.complete.status === "failed" ? "✕ RUN FAILED" : "✓ RUN COMPLETE"}</h3>
          {state.complete.final_score !== null ? (
            <>
              <ScoreBar label="FINAL" score={state.complete.final_score} />
              <p style={{ color: "var(--text-dim)", marginTop: 10 }}>
                {state.complete.initial_score?.toFixed(1)} → {state.complete.final_score.toFixed(1)}
                {" "}
                ({(state.complete.total_improvement ?? 0) >= 0 ? "+" : ""}
                {state.complete.total_improvement?.toFixed(1)}) over {state.complete.iteration_count} iteration
                {state.complete.iteration_count === 1 ? "" : "s"} — {state.complete.status}
              </p>
            </>
          ) : (
            <p style={{ color: "var(--accent-red)" }}>
              Failed before any iteration completed — see error above.
            </p>
          )}
          <button className="btn" style={{ marginTop: 14 }} onClick={() => navigate(`/runs/${state.complete!.run_id}`)}>
            VIEW FULL DETAIL
          </button>
        </div>
      )}

      {previous && latest && (
        <div className="panel">
          <h3 className="panel-title">DIFF — ITERATION {previous.iteration_number} → {latest.iteration_number}</h3>
          <DiffView before={previous.response} after={latest.response} />
        </div>
      )}

      {[...state.iterations].reverse().map((it) => (
        <div key={it.iteration_number} className={`iteration-card ${it.is_final ? "is-final" : ""}`}>
          <div className="iteration-header">
            <span>
              ITERATION {it.iteration_number} · {it.model_used} · {it.latency_ms.toFixed(0)}ms
            </span>
            {it.is_final && <span className="badge">FINAL</span>}
          </div>
          <ScoreBar score={it.score} label={`ITER ${it.iteration_number}`} />
          {it.improvement_delta !== null && (
            <p style={{ color: it.improvement_delta >= 0 ? "var(--accent)" : "var(--accent-red)", fontSize: 15, marginTop: 6 }}>
              {it.improvement_delta >= 0 ? "▲" : "▼"} {it.improvement_delta.toFixed(2)} vs previous
            </p>
          )}
          <div className="response-text">{it.response}</div>
          <CritiquePanel
            critique={it.critique}
            strengths={it.strengths}
            weaknesses={it.weaknesses}
            suggestions={it.suggestions}
          />
        </div>
      ))}

      {state.phase === "connecting" && <div className="empty-state">CONNECTING TO ARENA…</div>}
      {state.phase === "running" && state.iterations.length === 0 && (
        <div className="empty-state">
          <span className="blink">GENERATING…</span>
        </div>
      )}
    </div>
  );
}
