"""
RELIABILITY TRACKER — in-memory success/failure counts per (provider, model),
used to sort /api/models so the models most likely to actually work show up
first. Resets on backend restart — it only needs to reflect "recently
enough", not persist across deploys.
"""

from collections import defaultdict


class ReliabilityTracker:
    def __init__(self):
        self._success: dict[tuple[str, str], int] = defaultdict(int)
        self._failure: dict[tuple[str, str], int] = defaultdict(int)

    def record_success(self, provider: str, model: str) -> None:
        self._success[(provider, model)] += 1

    def record_failure(self, provider: str, model: str) -> None:
        self._failure[(provider, model)] += 1

    def score(self, provider: str, model: str) -> float:
        """Success rate, 0..1. No data yet = 0.5 — unproven, not penalized."""
        s = self._success.get((provider, model), 0)
        f = self._failure.get((provider, model), 0)
        total = s + f
        if total == 0:
            return 0.5
        return s / total

    def sort_models(self, provider: str, models: list[str]) -> list[str]:
        """Most reliable first. Stable on ties, so an untouched catalog's
        original ordering survives until real call data pulls things apart."""
        return sorted(models, key=lambda m: self.score(provider, m), reverse=True)


tracker = ReliabilityTracker()
