from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence


@dataclass(frozen=True)
class FederatedDataNode:
    """Metadata describing an OSINT enclave in the federation."""

    node_id: str
    locality: str
    privacy_budget: float
    sensitivity_ceiling: int
    latency_penalty_ms: int
    supported_capabilities: tuple[str, ...]
    sovereign: bool = False

    def can_process(self, capability: str, sensitivity: int) -> bool:
        return (
            capability in self.supported_capabilities
            and sensitivity <= self.sensitivity_ceiling
        )


@dataclass(frozen=True)
class FederatedQueryRequest:
    query_id: str
    required_capabilities: tuple[str, ...]
    sensitivity: int
    preferred_localities: tuple[str, ...]
    privacy_budget: float
    estimated_edges: int


@dataclass(frozen=True)
class FederatedPlanStep:
    node_id: str
    capability: str
    estimated_latency_ms: int
    privacy_cost: float
    rationale: str
    secure_aggregation: bool


@dataclass(frozen=True)
class FederatedQueryPlan:
    query_id: str
    steps: tuple[FederatedPlanStep, ...]
    residual_budget: float
    warnings: tuple[str, ...]


class FederatedQueryPlanner:
    """Greedy planner that honours locality and privacy budgets."""

    def __init__(self, nodes: Sequence[FederatedDataNode]):
        self._nodes = list(nodes)

    def plan(self, request: FederatedQueryRequest) -> FederatedQueryPlan:
        if not request.required_capabilities:
            raise ValueError("at least one capability is required")
        steps: list[FederatedPlanStep] = []
        budget_remaining = request.privacy_budget
        warnings: list[str] = []

        ordered_nodes = sorted(
            self._nodes,
            key=lambda node: (
                0 if node.locality in request.preferred_localities else 1,
                node.latency_penalty_ms,
                -node.privacy_budget,
            ),
        )

        for capability in request.required_capabilities:
            candidate = self._select_node(ordered_nodes, capability, request.sensitivity)
            if candidate is None:
                warnings.append(
                    f"no node can satisfy capability {capability} at sensitivity {request.sensitivity}"
                )
                continue

            privacy_cost = max(0.05, request.estimated_edges / 100_000)
            if candidate.sovereign and candidate.locality not in request.preferred_localities:
                privacy_cost *= 1.5
            budget_remaining -= privacy_cost

            step = FederatedPlanStep(
                node_id=candidate.node_id,
                capability=capability,
                estimated_latency_ms=candidate.latency_penalty_ms + 25,
                privacy_cost=round(privacy_cost, 4),
                rationale=self._rationale(candidate, capability, request),
                secure_aggregation=candidate.sovereign,
            )
            steps.append(step)

        if budget_remaining < 0:
            warnings.append(
                "privacy budget exceeded; consider trimming query scope or rebalancing enclaves"
            )

        return FederatedQueryPlan(
            query_id=request.query_id,
            steps=tuple(steps),
            residual_budget=round(max(budget_remaining, 0.0), 4),
            warnings=tuple(warnings),
        )

    @staticmethod
    def _select_node(
        nodes: Iterable[FederatedDataNode], capability: str, sensitivity: int
    ) -> FederatedDataNode | None:
        for node in nodes:
            if node.can_process(capability, sensitivity):
                return node
        return None

    @staticmethod
    def _rationale(
        node: FederatedDataNode, capability: str, request: FederatedQueryRequest
    ) -> str:
        locality_hint = (
            "preferred locality match"
            if node.locality in request.preferred_localities
            else "cross-region placement"
        )
        return (
            f"route {capability} to {node.node_id} due to {locality_hint} and latency"
            f" allowance {node.latency_penalty_ms} ms"
        )
