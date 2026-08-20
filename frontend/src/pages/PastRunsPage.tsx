import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteRun, listRuns } from "../api";
import type { RunSummary } from "../types";

export default function PastRunsPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listRuns()
      .then(setRuns)
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(load, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteRun(id);
    load();
  }

  return (
    <div>
      <div className="panel">
        <h3 className="panel-title">PAST RUNS</h3>

        {error && <div className="error-banner">{error}</div>}

        {!error && runs === null && <div className="empty-state">LOADING…</div>}
        {runs && runs.length === 0 && <div className="empty-state">NO RUNS YET — GO START ONE</div>}

        {runs && runs.length > 0 && (
          <div className="run-list">
            {runs.map((r) => (
              <Link key={r.id} to={`/runs/${r.id}`} className="run-row">
                <span>{r.prompt_preview}</span>
                <span>{r.generator}</span>
                <span>
                  {r.initial_score?.toFixed(1) ?? "—"} → {r.final_score?.toFixed(1) ?? "—"}
                </span>
                <span className={`status-pill status-${r.status}`}>{r.status}</span>
                <button className="btn btn-ghost" onClick={(e) => handleDelete(r.id, e)}>
                  ✕
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
