from dataclasses import dataclass
from typing import Literal, Optional, Dict, Any, List

HealthState = Literal["HEALTHY", "DEGRADED", "CRITICAL", "UNKNOWN"]

@dataclass(frozen=True)
class EventSignal:
    cluster_id: str
    namespace: Optional[str]
    kind: str              # e.g., Pod/Node/Deployment
    reason: str            # e.g., CrashLoopBackOff / FailedScheduling
    message: str           # untrusted text; do not feed to LLM unfiltered
    ts_unix: int
    labels: Dict[str, str]

@dataclass(frozen=True)
class ClusterSnapshot:
    cluster_id: str
    cpu_util_pct: Optional[float]
    mem_util_pct: Optional[float]
    ready_nodes: Optional[int]
    total_nodes: Optional[int]
    workloads: Dict[str, Any]
    events: List[EventSignal]
