"""Token budget thresholds for context compression."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CompressionThresholds:
    warn_fraction: float = 0.75
    truncate_fraction: float = 0.85
    summarize_fraction: float = 0.90

    def as_dict(self) -> dict[str, float]:
        return {
            "warn_fraction": self.warn_fraction,
            "truncate_fraction": self.truncate_fraction,
            "summarize_fraction": self.summarize_fraction,
        }
