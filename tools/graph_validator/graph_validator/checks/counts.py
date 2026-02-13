from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class CountsResult:
    status: str
    details: Dict[str, int]


def placeholder_counts() -> CountsResult:
    return CountsResult(status='pending', details={})
