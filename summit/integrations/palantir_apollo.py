from __future__ import annotations

import json
from dataclasses import dataclass
from typing import List, Dict, Optional
from pathlib import Path

@dataclass
class ReleaseChannel:
    name: str
    requires_approval: bool
    sla_latency_ms: int

@dataclass
class ProductRelease:
    version: str
    channel: str
    metrics: Dict[str, float]

class ReleaseGate:
    """
    Enforces Apollo-style release gates based on Summit evidence artifacts.
    """
    def __init__(self, channels: List[ReleaseChannel]):
        self.channels = {c.name: c for c in channels}

    def evaluate_release(self, release: ProductRelease) -> str:
        """
        Returns 'GO' or 'NO-GO' based on channel SLA and evidence.
        """
        channel = self.channels.get(release.channel)
        if not channel:
            return "NO-GO: Unknown Channel"

        runtime = release.metrics.get("runtime_ms", float('inf'))

        if runtime > channel.sla_latency_ms:
            return f"NO-GO: Latency {runtime}ms > SLA {channel.sla_latency_ms}ms"

        return "GO"

def load_metrics(metrics_path: Path) -> Dict[str, float]:
    if not metrics_path.exists():
        return {}
    data = json.loads(metrics_path.read_text())
    return data.get("metrics", {})
