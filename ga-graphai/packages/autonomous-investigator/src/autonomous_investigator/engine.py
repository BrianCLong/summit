"""Investigation orchestration engine with patent-grade differentiators."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from itertools import combinations
from statistics import mean, pstdev

import networkx as nx

from .domain import (
    CorrelationReport,
    DomainCorrelation,
    EvidenceChain,
    EvidenceLink,
    Hypothesis,
    Objective,
    Plan,
    Signal,
    Task,
)


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
        self._primary_domains = ("osint", "finintel", "cyber", "forensics")

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

    def _build_signal_graph(self, signals: list[Signal]) -> nx.Graph:
        graph = nx.Graph()
        for signal in signals:
            normalized_domain = self._normalize_domain(signal.domain)
            graph.add_node(
                signal.id,
                severity=signal.severity,
                confidence=signal.confidence,
                signal_type=signal.signal_type,
                domain=normalized_domain,
            )
        for first, second in combinations(signals, 2):
            weight = self._compute_link_weight(first, second)
            graph.add_edge(first.id, second.id, weight=weight)
        return graph

    def _compute_link_weight(self, first: Signal, second: Signal) -> float:
        type_bonus = 1.7 if first.signal_type == second.signal_type else 1.0
        cross_domain_bonus = (
            1.15
            if self._normalize_domain(first.domain)
            != self._normalize_domain(second.domain)
            else 1.0
        )
        severity_alignment = 1.0 - abs(first.severity - second.severity)
        confidence_alignment = mean([first.confidence, second.confidence])
        divergence_penalty = abs(first.confidence - second.confidence) * 0.35
        weight = (
            max(severity_alignment, 0.05)
            * (confidence_alignment + 0.05)
            * type_bonus
            * cross_domain_bonus
        )
        return round(max(weight - divergence_penalty, 0.05), 4)

    def _derive_hypotheses(
        self,
        signals: list[Signal],
        objectives: list[Objective],
        graph: nx.Graph,
        risk_appetite: float,
    ) -> list[Hypothesis]:
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
        hypotheses: list[Hypothesis] = []
        for signal in signals:
            base_probability = 0.55 * signal.confidence + 0.45 * signal.severity
            network_synergy = centrality.get(signal.id, 1.0 / len(signals)) + betweenness.get(
                signal.id, 0.0
            )
            probability = min(
                0.99, base_probability * (1 + self.coefficients.synergy_bias * network_synergy)
            )
            novelty = self._novelty_score(signal, graph, divergence)
            expected_impact = probability * (objective_pressure + risk_appetite)
            counterfactual_penalty = (
                max(0.05, divergence.get(signal.id, 0.1)) * self.coefficients.counterfactual_bias
            )
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

    def _novelty_score(
        self, signal: Signal, graph: nx.Graph, divergence: dict[str, float]
    ) -> float:
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

    def _summarize_hypothesis(self, signal: Signal, objectives: list[Objective]) -> str:
        objective = objectives[0].description if objectives else "the mission directive"
        return (
            f"{signal.description} prioritizes the {signal.signal_type} surface "
            f"relative to {objective}."
        )

    def _compose_tasks(
        self,
        case_id: str,
        hypotheses: list[Hypothesis],
        resources: Iterable[str],
        objectives: list[Objective],
    ) -> list[Task]:
        selected = hypotheses[:3]
        plan_tasks: list[Task] = []
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

    def _enumerate_differentiators(
        self, graph: nx.Graph, hypotheses: list[Hypothesis]
    ) -> list[str]:
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

    def _build_counterfactuals(self, hypotheses: list[Hypothesis]) -> list[str]:
        branches = []
        for hypothesis in hypotheses[:3]:
            branches.append(
                f"If {hypothesis.id} fails, redirect swarm to latent-signal ensemble with penalty "
                f"{hypothesis.counterfactual_penalty:.2f}."
            )
        return branches or ["Establish default counterfactual monitoring cadence."]

    def _compute_assurance(self, hypotheses: list[Hypothesis], counterfactuals: list[str]) -> float:
        if not hypotheses:
            return self.coefficients.assurance_floor
        mean_probability = mean(hypothesis.probability for hypothesis in hypotheses[:3])
        penalty = mean(hypothesis.counterfactual_penalty for hypothesis in hypotheses[:3])
        assurance = max(
            self.coefficients.assurance_floor,
            mean_probability - penalty + 0.1 * len(counterfactuals),
        )
        return round(min(0.99, assurance), 4)

    def build_correlation_report(
        self,
        case_id: str,
        signals: Iterable[Signal],
        objectives: Iterable[Objective],
    ) -> CorrelationReport:
        signal_list = list(signals)
        graph = self._build_signal_graph(signal_list)
        domain_correlations = self._summarize_domains(signal_list)
        evidence_chains = self._construct_evidence_chains(case_id, graph, signal_list)
        overall_confidence = self._correlation_confidence(domain_correlations, evidence_chains)
        summary = self._report_summary(domain_correlations, objectives, overall_confidence)
        return CorrelationReport(
            case_id=case_id,
            summary=summary,
            domain_correlations=domain_correlations,
            evidence_chains=evidence_chains,
            overall_confidence=overall_confidence,
        )

    def _summarize_domains(self, signals: list[Signal]) -> list[DomainCorrelation]:
        if not signals:
            return []
        total = len(signals)
        by_domain: dict[str, list[Signal]] = {}
        for signal in signals:
            domain = self._normalize_domain(signal.domain)
            by_domain.setdefault(domain, []).append(signal)
        correlations: list[DomainCorrelation] = []
        for domain, entries in by_domain.items():
            correlations.append(
                DomainCorrelation(
                    domain=domain,
                    signals=[entry.id for entry in entries],
                    coverage=round(len(entries) / total, 3),
                    mean_confidence=round(mean(entry.confidence for entry in entries), 4),
                    mean_severity=round(mean(entry.severity for entry in entries), 4),
                    dominant_types=self._top_signal_types(entries),
                )
            )
        correlations.sort(key=lambda correlation: correlation.coverage, reverse=True)
        return correlations

    def _top_signal_types(self, signals: list[Signal]) -> list[str]:
        counts: dict[str, int] = {}
        for signal in signals:
            counts[signal.signal_type] = counts.get(signal.signal_type, 0) + 1
        sorted_types = sorted(counts.items(), key=lambda item: item[1], reverse=True)
        return [signal_type for signal_type, _ in sorted_types[:2]]

    def _construct_evidence_chains(
        self, case_id: str, graph: nx.Graph, signals: list[Signal]
    ) -> list[EvidenceChain]:
        if graph.number_of_edges() == 0 or not signals:
            return []
        signal_index = {signal.id: signal for signal in signals}
        sorted_edges = sorted(
            graph.edges(data=True), key=lambda edge: edge[2].get("weight", 0.0), reverse=True
        )
        cross_domain_edges = [
            edge
            for edge in sorted_edges
            if graph.nodes[edge[0]].get("domain") != graph.nodes[edge[1]].get("domain")
        ]
        prioritized_edges = cross_domain_edges or sorted_edges
        chains: list[EvidenceChain] = []
        for index, (source, target, data) in enumerate(prioritized_edges[:3], start=1):
            source_signal = signal_index[source]
            target_signal = signal_index[target]
            confidence = round(data.get("weight", 0.05), 4)
            rationale = (
                f"Correlation between {source_signal.domain.upper()} {source_signal.signal_type} "
                f"and {target_signal.domain.upper()} {target_signal.signal_type}."
            )
            chains.append(
                EvidenceChain(
                    chain_id=f"{case_id}-evidence-chain-{index}",
                    links=[
                        EvidenceLink(
                            source_id=source_signal.id,
                            target_id=target_signal.id,
                            rationale=rationale,
                            confidence=confidence,
                        )
                    ],
                    strength=confidence,
                    narrative=self._build_chain_narrative(
                        source_signal, target_signal, confidence
                    ),
                )
            )
        multi_hop = self._best_multi_hop_chain(case_id, graph, signal_index)
        if multi_hop:
            chains.insert(0, multi_hop)
        return chains

    def _best_multi_hop_chain(
        self, case_id: str, graph: nx.Graph, signal_index: dict[str, Signal]
    ) -> EvidenceChain | None:
        best_path: tuple[str, str, str] | None = None
        best_strength = 0.0
        for source, pivot, data in graph.edges(data=True):
            first_weight = data.get("weight", 0.05)
            for target in graph.neighbors(pivot):
                if target == source:
                    continue
                second_weight = graph.edges[pivot, target].get("weight", 0.05)
                domains = {
                    graph.nodes[source].get("domain"),
                    graph.nodes[pivot].get("domain"),
                    graph.nodes[target].get("domain"),
                }
                if len(domains) < 2:
                    continue
                combined = (first_weight + second_weight) / 2
                if combined > best_strength:
                    best_strength = combined
                    best_path = (source, pivot, target)
        if not best_path:
            return None
        source_id, pivot_id, target_id = best_path
        source_signal = signal_index[source_id]
        pivot_signal = signal_index[pivot_id]
        target_signal = signal_index[target_id]
        narrative = (
            f"{source_signal.id} -> {pivot_signal.id} -> {target_signal.id} illustrates "
            f"multi-hop corroboration across {source_signal.domain}/{pivot_signal.domain}/"
            f"{target_signal.domain}. Confidence {best_strength:.2f}."
        )
        return EvidenceChain(
            chain_id=f"{case_id}-evidence-chain-0",
            links=[
                EvidenceLink(
                    source_id=source_id,
                    target_id=pivot_id,
                    rationale=self._link_rationale(source_signal, pivot_signal),
                    confidence=round(best_strength, 4),
                ),
                EvidenceLink(
                    source_id=pivot_id,
                    target_id=target_id,
                    rationale=self._link_rationale(pivot_signal, target_signal),
                    confidence=round(best_strength, 4),
                ),
            ],
            strength=round(best_strength, 4),
            narrative=narrative,
        )

    def _link_rationale(self, first: Signal, second: Signal) -> str:
        return (
            f"{first.domain.upper()} {first.signal_type} aligns with {second.domain.upper()}"
            f" {second.signal_type} based on temporal and behavioral overlap."
        )

    def _build_chain_narrative(
        self, source: Signal, target: Signal, confidence: float
    ) -> str:
        return (
            f"{source.id} ({source.domain}) intersects with {target.id} ({target.domain}) "
            f"via shared {source.signal_type}/{target.signal_type} artifacts. "
            f"Confidence {confidence:.2f} with emphasis on cross-domain validation."
        )

    def _correlation_confidence(
        self, domain_correlations: list[DomainCorrelation], chains: list[EvidenceChain]
    ) -> float:
        coverage_score = (
            mean(correlation.coverage for correlation in domain_correlations)
            if domain_correlations
            else 0.0
        )
        chain_strength = mean(chain.strength for chain in chains) if chains else 0.0
        primary_present = {
            correlation.domain for correlation in domain_correlations if correlation.domain in self._primary_domains
        }
        primary_ratio = len(primary_present) / len(self._primary_domains)
        domain_bonus = 0.08 * primary_ratio
        gap_penalty = 0.2 * (1 - primary_ratio)
        base = self.coefficients.assurance_floor
        confidence = (
            base
            + 0.25 * coverage_score * primary_ratio
            + 0.2 * chain_strength * primary_ratio
            + domain_bonus
            - gap_penalty
        )
        return round(min(0.99, confidence), 4)

    def _report_summary(
        self,
        domain_correlations: list[DomainCorrelation],
        objectives: Iterable[Objective],
        overall_confidence: float,
    ) -> str:
        domains = [correlation.domain for correlation in domain_correlations]
        objective_focus = next(iter(objectives)).description if objectives else "mission scope"
        missing_domains = [
            domain for domain in self._primary_domains if domain not in domains
        ]
        coverage_clause = (
            "Full coverage across OSINT/FinIntel/Cyber/Forensics"
            if not missing_domains
            else f"Coverage spans {', '.join(domains)}, gaps: {', '.join(missing_domains)}"
        )
        return (
            f"Unified cross-domain correlation for {objective_focus}. "
            f"{coverage_clause}. Confidence {overall_confidence:.2f}."
        )

    @staticmethod
    def _normalize_domain(domain: str | None) -> str:
        return domain.lower() if domain else "unspecified"
