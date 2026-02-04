from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

HealthState = Literal["HEALTHY", "DEGRADED", "CRITICAL", "UNKNOWN"]

@dataclass(frozen=True)
class EventSignal:
    cluster_id: str
    namespace: Optional[str]
    kind: str              # e.g., Pod/Node/Deployment
    reason: str            # e.g., CrashLoopBackOff / FailedScheduling
    message: str           # untrusted text; do not feed to LLM unfiltered
    ts_unix: int
    labels: dict[str, str]

@dataclass(frozen=True)
class ClusterSnapshot:
    cluster_id: str
    cpu_util_pct: Optional[float]
    mem_util_pct: Optional[float]
    ready_nodes: Optional[int]
    total_nodes: Optional[int]
    workloads: dict[str, Any]
    events: list[EventSignal]
