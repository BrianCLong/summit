"""Investigation orchestration engine with patent-grade differentiators."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from statistics import mean, pstdev
from typing import Iterable, List

import networkx as nx

from .domain import Hypothesis, Objective, Plan, Signal, Task


@dataclass(frozen=True)
class InnovationCoefficients:
    """Tunable innovation parameters for the autonomous engine."""

    synergy_bias: float = 0.55
    novelty_bias: float = 0.35
    counterfactual_bias: float = 0.25
    assurance_floor: float = 0.65


class InvestigatorEngine:
    """Derives patent-differentiated investigation plans from complex signals."""

    def __init__(self, coefficients: InnovationCoefficients | None = None) -> None:
        self.coefficients = coefficients or InnovationCoefficients()

    def build_plan(
        self,
        case_id: str,
        signals: Iterable[Signal],
        objectives: Iterable[Objective],
        resources: Iterable[str],
        risk_appetite: float,
    ) -> Plan:
        signal_list = list(signals)
        objective_list = sorted(objectives, key=lambda obj: obj.priority)
        graph = self._build_signal_graph(signal_list)
        hypotheses = self._derive_hypotheses(signal_list, objective_list, graph, risk_appetite)
        tasks = self._compose_tasks(case_id, hypotheses, resources, objective_list)
        differentiation = self._enumerate_differentiators(graph, hypotheses)
        counterfactuals = self._build_counterfactuals(hypotheses)
        assurance = self._compute_assurance(hypotheses, counterfactuals)
        return Plan(
            case_id=case_id,
            hypotheses=hypotheses,
            tasks=tasks,
            differentiation_factors=differentiation,
            counterfactual_branches=counterfactuals,
            assurance_score=assurance,
        )

    def _build_signal_graph(self, signals: List[Signal]) -> nx.Graph:
        graph = nx.Graph()
        for signal in signals:
            graph.add_node(
                signal.id,
                severity=signal.severity,
                confidence=signal.confidence,
                signal_type=signal.signal_type,
            )
        for first, second in combinations(signals, 2):
            weight = self._compute_link_weight(first, second)
            graph.add_edge(first.id, second.id, weight=weight)
        return graph

    def _compute_link_weight(self, first: Signal, second: Signal) -> float:
        type_bonus = 1.7 if first.signal_type == second.signal_type else 1.0
        severity_alignment = 1.0 - abs(first.severity - second.severity)
        confidence_alignment = mean([first.confidence, second.confidence])
        divergence_penalty = abs(first.confidence - second.confidence) * 0.35
        weight = max(severity_alignment, 0.05) * (confidence_alignment + 0.05) * type_bonus
        return round(max(weight - divergence_penalty, 0.05), 4)

    def _derive_hypotheses(
        self,
        signals: List[Signal],
        objectives: List[Objective],
        graph: nx.Graph,
        risk_appetite: float,
    ) -> List[Hypothesis]:
        if not signals:
            return []
        centrality = nx.pagerank(graph, weight="weight") if graph.number_of_nodes() > 0 else {}
        betweenness = (
            nx.betweenness_centrality(graph, weight="weight", normalized=True)
            if graph.number_of_edges() > 0
            else {signal.id: 0.0 for signal in signals}
        )
        divergence = self._divergence_index(graph)
        objective_pressure = mean(obj.priority for obj in objectives) if objectives else 1.0
        hypotheses: List[Hypothesis] = []
        for signal in signals:
            base_probability = 0.55 * signal.confidence + 0.45 * signal.severity
            network_synergy = centrality.get(signal.id, 1.0 / len(signals)) + betweenness.get(signal.id, 0.0)
            probability = min(0.99, base_probability * (1 + self.coefficients.synergy_bias * network_synergy))
            novelty = self._novelty_score(signal, graph, divergence)
            expected_impact = probability * (objective_pressure + risk_appetite)
            counterfactual_penalty = max(0.05, divergence.get(signal.id, 0.1)) * self.coefficients.counterfactual_bias
            hypotheses.append(
                Hypothesis(
                    id=f"hypothesis-{signal.id}",
                    summary=self._summarize_hypothesis(signal, objectives),
                    probability=round(probability, 4),
                    novelty_score=round(novelty, 4),
                    expected_impact=round(expected_impact, 4),
                    supporting_signals=[signal.id],
                    counterfactual_penalty=round(counterfactual_penalty, 4),
                )
            )
        hypotheses.sort(key=lambda hyp: hyp.expected_impact, reverse=True)
        return hypotheses

    def _novelty_score(self, signal: Signal, graph: nx.Graph, divergence: dict[str, float]) -> float:
        neighbor_types = {
            graph.nodes[neighbor]["signal_type"]
            for neighbor in graph.neighbors(signal.id)
            if "signal_type" in graph.nodes[neighbor]
        }
        adjacency_factor = 1 / (1 + len(neighbor_types))
        divergence_factor = 1 + divergence.get(signal.id, 0.0)
        return max(0.1, self.coefficients.novelty_bias * divergence_factor + adjacency_factor)

    def _divergence_index(self, graph: nx.Graph) -> dict[str, float]:
        divergence: dict[str, float] = {}
        for node in graph.nodes:
            confidence = graph.nodes[node].get("confidence", 0.0)
            neighbor_conf = [graph.nodes[n].get("confidence", 0.0) for n in graph.neighbors(node)]
            if neighbor_conf:
                divergence[node] = abs(confidence - mean(neighbor_conf))
            else:
                divergence[node] = 0.25
        return divergence

    def _summarize_hypothesis(self, signal: Signal, objectives: List[Objective]) -> str:
        objective = objectives[0].description if objectives else "the mission directive"
        return (
            f"{signal.description} prioritizes the {signal.signal_type} surface "
            f"relative to {objective}."
        )

    def _compose_tasks(
        self,
        case_id: str,
        hypotheses: List[Hypothesis],
        resources: Iterable[str],
        objectives: List[Objective],
    ) -> List[Task]:
        selected = hypotheses[:3]
        plan_tasks: List[Task] = []
        for index, hypothesis in enumerate(selected, start=1):
            plan_tasks.append(
                Task(
                    id=f"{case_id}-autonomy-{index}",
                    title=f"Autonomous triage for {hypothesis.id}",
                    action="Deploy multi-agent evidence sweep with adaptive verification gates.",
                    owning_agent="sentinel-triad",
                    innovation_vectors=[
                        "triangulated-hypothesis-graph",
                        "counterfactual-gap-mapper",
                    ],
                    estimated_hours=2.5,
                    verification_metric=">90% signal concordance",
                )
            )
            plan_tasks.append(
                Task(
                    id=f"{case_id}-projection-{index}",
                    title="Generate counterfactual projection",
                    action="Simulate absence of primary signal and compute cascading impact on threat lattice.",
                    owning_agent="chrono-sim",
                    dependencies=[f"{case_id}-autonomy-{index}"],
                    innovation_vectors=["assurance-spectrum-weaver"],
                    estimated_hours=1.25,
                    verification_metric="Delta risk below 0.15",
                )
            )
        if not plan_tasks:
            plan_tasks.append(
                Task(
                    id=f"{case_id}-boot",
                    title="Initialize autonomous workspace",
                    action="Prime workcell with baseline heuristics.",
                    owning_agent="sentinel-triad",
                )
            )
        resources_text = ", ".join(sorted(resources)) or "default autonomy pool"
        mission_task = Task(
            id=f"{case_id}-mission-sync",
            title="Mission synchronization",
            action=f"Synchronize findings with resources: {resources_text}.",
            owning_agent="mission-weaver",
            innovation_vectors=["just-in-time-swarm-allocation"],
            estimated_hours=0.75,
            verification_metric="All leads acknowledged",
            dependencies=[task.id for task in plan_tasks[:2]],
        )
        plan_tasks.append(mission_task)
        return plan_tasks

    def _enumerate_differentiators(self, graph: nx.Graph, hypotheses: List[Hypothesis]) -> List[str]:
        graph_tension = self._graph_tension(graph)
        leading_prob = hypotheses[0].probability if hypotheses else 0.0
        return [
            "Triangulated hypothesis graph with adaptive counterfactual gating.",
            f"Patent-grade tension index control (score={graph_tension:.3f}).",
            f"Self-tuning assurance baseline anchored at {max(self.coefficients.assurance_floor, leading_prob):.2f}.",
        ]

    def _graph_tension(self, graph: nx.Graph) -> float:
        if graph.number_of_edges() == 0:
            return 0.1
        weights = [data.get("weight", 0.1) for _, _, data in graph.edges(data=True)]
        return pstdev(weights) if len(weights) > 1 else weights[0]

    def _build_counterfactuals(self, hypotheses: List[Hypothesis]) -> List[str]:
        branches = []
        for hypothesis in hypotheses[:3]:
            branches.append(
                (
                    f"If {hypothesis.id} fails, redirect swarm to latent-signal ensemble with penalty "
                    f"{hypothesis.counterfactual_penalty:.2f}."
                )
            )
        return branches or ["Establish default counterfactual monitoring cadence."]

    def _compute_assurance(self, hypotheses: List[Hypothesis], counterfactuals: List[str]) -> float:
        if not hypotheses:
            return self.coefficients.assurance_floor
        mean_probability = mean(hypothesis.probability for hypothesis in hypotheses[:3])
        penalty = mean(hypothesis.counterfactual_penalty for hypothesis in hypotheses[:3])
        assurance = max(
            self.coefficients.assurance_floor,
            mean_probability - penalty + 0.1 * len(counterfactuals),
        )
        return round(min(0.99, assurance), 4)
