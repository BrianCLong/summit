from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List

# Baseline MFT-5 used by MAG evaluations (Care/Fairness/Loyalty/Authority/Sanctity).
MFT5: list[str] = ["care", "fairness", "loyalty", "authority", "sanctity"]

UNKNOWN_KEY = "unknown"

def normalize(vec: dict[str, float], *, allow_unknown: bool = True) -> dict[str, float]:
    """
    Deterministically normalize a moral vector.
    - Missing foundations default to 0.
    - If total mass is ~0, returns unknown=1 (deny-by-default signal).
    """
    keys = list(MFT5)
    if allow_unknown:
        keys.append(UNKNOWN_KEY)
    out = {k: float(vec.get(k, 0.0)) for k in keys}
    total = sum(v for k, v in out.items() if k != UNKNOWN_KEY)
    if total <= 1e-12:
        return {k: (1.0 if k == UNKNOWN_KEY else 0.0) for k in keys}
    for k in MFT5:
        out[k] = out[k] / total
    out[UNKNOWN_KEY] = 0.0 if allow_unknown else out.get(UNKNOWN_KEY, 0.0)
    return out
