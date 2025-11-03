import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from federation import (  # type: ignore  # noqa: E402
    FederatedDataNode,
    FederatedQueryPlanner,
    FederatedQueryRequest,
)


def test_federated_planner_prefers_locality_and_budget():
    planner = FederatedQueryPlanner(
        [
            FederatedDataNode(
                node_id="us-edge",
                locality="us-east",
                privacy_budget=1.0,
                sensitivity_ceiling=3,
                latency_penalty_ms=50,
                supported_capabilities=("entity-resolution",),
            ),
            FederatedDataNode(
                node_id="eu-research",
                locality="eu-central",
                privacy_budget=3.0,
                sensitivity_ceiling=5,
                latency_penalty_ms=60,
                supported_capabilities=("entity-resolution", "narrative-forensics"),
                sovereign=True,
            ),
        ]
    )
    plan = planner.plan(
        FederatedQueryRequest(
            query_id="demo",
            required_capabilities=("entity-resolution",),
            sensitivity=3,
            preferred_localities=("eu-central",),
            privacy_budget=2.0,
            estimated_edges=20000,
        )
    )
    assert plan.steps[0].node_id == "eu-research"
    assert plan.residual_budget <= 2.0
    assert plan.steps[0].secure_aggregation is True
