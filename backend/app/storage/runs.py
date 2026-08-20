"""
RUN STORAGE — Persistence layer.

Keeps completed runs so users can revisit and compare them.
Using simple JSON file storage for simplicity — swap to SQLite/Postgres
if this grows. The interface stays the same either way.
"""

import json
import os
import logging
from typing import Optional
from ..models.domain import RefinementRun

logger = logging.getLogger(__name__)

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "runs")


class RunStore:
    """File-based run persistence. One JSON file per run."""

    def __init__(self, storage_dir: str = STORAGE_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def _path(self, run_id: str) -> str:
        # Sanitize to prevent path traversal
        safe_id = "".join(c for c in run_id if c.isalnum() or c == "-")
        return os.path.join(self.storage_dir, f"{safe_id}.json")

    async def save_run(self, run: RefinementRun) -> None:
        """Persist a completed run."""
        path = self._path(run.id)
        with open(path, "w") as f:
            f.write(run.model_dump_json(indent=2))
        logger.info(f"Saved run {run.id} to {path}")

    async def get_run(self, run_id: str) -> Optional[RefinementRun]:
        """Load a run by ID."""
        path = self._path(run_id)
        if not os.path.exists(path):
            return None
        with open(path) as f:
            data = json.load(f)
        return RefinementRun(**data)

    async def list_runs(
        self, limit: int = 20, offset: int = 0
    ) -> list[RefinementRun]:
        """List all runs, newest first."""
        files = []
        for fname in os.listdir(self.storage_dir):
            if fname.endswith(".json"):
                fpath = os.path.join(self.storage_dir, fname)
                files.append((fpath, os.path.getmtime(fpath)))

        # Sort by modification time, newest first
        files.sort(key=lambda x: x[1], reverse=True)

        runs = []
        for fpath, _ in files[offset : offset + limit]:
            try:
                with open(fpath) as f:
                    data = json.load(f)
                runs.append(RefinementRun(**data))
            except Exception as e:
                logger.warning(f"Failed to load {fpath}: {e}")
        return runs

    async def delete_run(self, run_id: str) -> bool:
        """Delete a run. Returns True if it existed."""
        path = self._path(run_id)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False


# Global instance
run_store = RunStore()
