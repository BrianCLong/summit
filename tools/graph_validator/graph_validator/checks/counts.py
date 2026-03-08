from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class CountsResult:
    status: str
    details: dict[str, int]


def placeholder_counts() -> CountsResult:
    return CountsResult(status='pending', details={})
