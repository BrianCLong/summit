"""Data models for the ICO planner."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class QuantizationOption:
    """Candidate quantization strategy for an endpoint."""

    name: str
    latency_ms: float
    accuracy: float
    qps_capacity: float
    cost_per_replica: float
    notes: str = ""

    def satisfies(self, latency_slo: float, accuracy_slo: float) -> bool:
        return self.latency_ms <= latency_slo and self.accuracy >= accuracy_slo


@dataclass(frozen=True)
class EndpointState:
    """Baseline description of an inference endpoint."""

    model: str
    endpoint: str
    baseline_replicas: int
    baseline_latency_ms: float
    baseline_accuracy: float
    baseline_cost_per_replica: float
    qps_capacity: float
    slo_latency_ms: float
    slo_accuracy: float
    projected_qps: float
    quantization_options: List[QuantizationOption]
    metadata: Dict[str, str] = field(default_factory=dict)

    @property
    def baseline_cost(self) -> float:
        return self.baseline_replicas * self.baseline_cost_per_replica


@dataclass(frozen=True)
class QuantizationChoice:
    """Concrete quantization choice for a plan."""

    name: str
    latency_ms: float
    accuracy: float
    qps_capacity: float
    cost_per_replica: float
    expected_savings: float


@dataclass(frozen=True)
class AutoscalingPlan:
    """Autoscaling recommendation for an endpoint."""

    min_replicas: int
    max_replicas: int
    target_replicas: int
    target_utilization: float

    def to_k8s_spec(self, name: str, namespace: str = "default") -> Dict[str, object]:
        return {
            "apiVersion": "autoscaling/v2",
            "kind": "HorizontalPodAutoscaler",
            "metadata": {"name": name, "namespace": namespace},
            "spec": {
                "minReplicas": self.min_replicas,
                "maxReplicas": self.max_replicas,
                "metrics": [
                    {
                        "type": "Resource",
                        "resource": {
                            "name": "cpu",
                            "target": {
                                "type": "Utilization",
                                "averageUtilization": int(round(self.target_utilization * 100)),
                            },
                        },
                    }
                ],
                "behavior": {
                    "scaleUp": {"stabilizationWindowSeconds": 60},
                    "scaleDown": {"stabilizationWindowSeconds": 120},
                },
            },
        }


@dataclass(frozen=True)
class EndpointPlan:
    """Combined plan for autoscaling and quantization."""

    endpoint: EndpointState
    autoscaling: AutoscalingPlan
    quantization: QuantizationChoice
    baseline_cost: float
    planned_cost: float
    latency_headroom_ms: float
    accuracy_headroom: float

    def savings_pct(self) -> float:
        if self.baseline_cost == 0:
            return 0.0
        return (self.baseline_cost - self.planned_cost) / self.baseline_cost

    def quantization_recipe(self) -> Dict[str, object]:
        return {
            "model": self.endpoint.model,
            "endpoint": self.endpoint.endpoint,
            "strategy": self.quantization.name,
            "expected_accuracy": self.quantization.accuracy,
            "expected_latency_ms": self.quantization.latency_ms,
            "qps_capacity": self.quantization.qps_capacity,
            "notes": self.endpoint.metadata.get("quantization_notes", ""),
        }

    def hpa_name(self) -> str:
        return f"{self.endpoint.model}-{self.endpoint.endpoint}-ico".replace("_", "-")

    def hpa_spec(self, namespace: str = "default") -> Dict[str, object]:
        return self.autoscaling.to_k8s_spec(self.hpa_name(), namespace)


@dataclass(frozen=True)
class PlanningSummary:
    """Aggregated summary for a set of endpoint plans."""

    plans: List[EndpointPlan]

    def total_baseline_cost(self) -> float:
        return sum(plan.baseline_cost for plan in self.plans)

    def total_planned_cost(self) -> float:
        return sum(plan.planned_cost for plan in self.plans)

    def total_savings_pct(self) -> float:
        baseline = self.total_baseline_cost()
        if baseline == 0:
            return 0.0
        return (baseline - self.total_planned_cost()) / baseline

    def hpa_specs(self, namespace: str = "default") -> List[Dict[str, object]]:
        return [plan.hpa_spec(namespace) for plan in self.plans]

    def quantization_recipes(self) -> List[Dict[str, object]]:
        return [plan.quantization_recipe() for plan in self.plans]

