from dataclasses import dataclass
from typing import Dict

@dataclass
class DriftScore:
  total: float
  components: Dict[str, float]

def score_drift(baseline: Dict[str, float], current: Dict[str, float]) -> DriftScore:
  comps = {}
  total = 0.0
  for k, b in baseline.items():
    c = float(current.get(k, b))
    d = abs(c - float(b))
    comps[k] = d
    total += d
  return DriftScore(total=total, components=comps)
