from dataclasses import dataclass

from modules.signals.models import ClusterSnapshot, HealthState


@dataclass(frozen=True)
class HealthScore:
    score_0_100: int
    state: HealthState
    drivers: list[str]   # short structured reasons

def compute_health(snapshot: ClusterSnapshot) -> HealthScore:
    # TODO: calibration; keep deterministic; no external calls.
    score = 100
    drivers: list[str] = []

    # Example penalties (adjust after evals):
    if snapshot.total_nodes and snapshot.ready_nodes is not None:
        if snapshot.ready_nodes < snapshot.total_nodes:
            score -= 25
            drivers.append("node_not_ready")

    if snapshot.cpu_util_pct is not None and snapshot.cpu_util_pct > 90:
        score -= 15
        drivers.append("cpu_high")

    if snapshot.mem_util_pct is not None and snapshot.mem_util_pct > 90:
        score -= 15
        drivers.append("mem_high")

    score = max(0, min(100, score))
    if score >= 85:
        state: HealthState = "HEALTHY"
    elif score >= 60:
        state = "DEGRADED"
    else:
        state = "CRITICAL"
    return HealthScore(score_0_100=score, state=state, drivers=drivers)
