from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EvidencePaths:
    report: str
    metrics: str
    stamp: str
