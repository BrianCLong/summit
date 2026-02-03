from dataclasses import dataclass
from typing import Dict


@dataclass
class DriftScore:
  total: float
  components: dict[str, float]

def score_drift(baseline: dict[str, float], current: dict[str, float]) -> DriftScore:
  comps = {}
  total = 0.0
  for k, b in baseline.items():
    c = float(current.get(k, b))
    d = abs(c - float(b))
    comps[k] = d
    total += d
  return DriftScore(total=total, components=comps)
