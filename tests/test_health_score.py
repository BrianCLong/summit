import pytest

from modules.scoring.health_score import compute_health
from modules.signals.models import ClusterSnapshot, EventSignal


def test_perfect_health():
    snapshot = ClusterSnapshot(
        cluster_id="c1",
        cpu_util_pct=50.0,
        mem_util_pct=50.0,
        ready_nodes=10,
        total_nodes=10,
        workloads={},
        events=[]
    )
    score = compute_health(snapshot)
    assert score.score_0_100 == 100
    assert score.state == "HEALTHY"
    assert score.drivers == []

def test_degraded_nodes():
    snapshot = ClusterSnapshot(
        cluster_id="c1",
        cpu_util_pct=50.0,
        mem_util_pct=50.0,
        ready_nodes=8,
        total_nodes=10,
        workloads={},
        events=[]
    )
    score = compute_health(snapshot)
    # 100 - 25 = 75
    assert score.score_0_100 == 75
    assert score.state == "DEGRADED"
    assert "node_not_ready" in score.drivers

def test_critical_high_load():
    snapshot = ClusterSnapshot(
        cluster_id="c1",
        cpu_util_pct=95.0, # -15
        mem_util_pct=95.0, # -15
        ready_nodes=8,     # -25
        total_nodes=10,
        workloads={},
        events=[]
    )
    score = compute_health(snapshot)
    # 100 - 15 - 15 - 25 = 45
    assert score.score_0_100 == 45
    assert score.state == "CRITICAL"
    assert "cpu_high" in score.drivers
    assert "mem_high" in score.drivers
