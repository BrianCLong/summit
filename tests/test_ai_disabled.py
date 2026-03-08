import pytest

from modules.ai.rca import rca
from modules.scoring.health_score import HealthScore
from modules.signals.models import ClusterSnapshot


def test_rca_is_stubbed():
    # Setup dummy inputs
    snapshot = ClusterSnapshot(
        cluster_id="c1",
        cpu_util_pct=10.0,
        mem_util_pct=10.0,
        ready_nodes=1,
        total_nodes=1,
        workloads={},
        events=[]
    )
    score = HealthScore(score_0_100=100, state="HEALTHY", drivers=[])

    # Execute
    result = rca(snapshot, score)

    # Assert deterministic "off" behavior
    assert result.hypothesis == []
    assert result.top_fixes == []
    assert result.confidence_0_1 == 0.0
