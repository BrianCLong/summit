from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class Finding:
    detector: str
    score: float
    reason: str

def detect(signal_bundle: dict[str, Any]) -> list[Finding]:
    """
    Placeholder: coordination anomaly on timing burstiness.
    Deny-by-default: produce no findings unless threshold exceeded.
    """
    bursts = signal_bundle.get("bursts_per_minute", {})
    if not bursts:
        return []
    peak = max(bursts.values())
    if peak >= 50:  # TODO tune via eval harness
        return [Finding(detector="coord_anom", score=float(peak), reason="peak_burst_ge_50")]
    return []
