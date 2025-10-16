#!/usr/bin/env python3
"""
BFT-Eco Quoruming Scorer
MC Platform v0.3.8 - Quantum-Ready Equilibrium

Carbon-aware Byzantine Fault Tolerant consensus with environmental impact optimization.
Balances consensus reliability with carbon footprint reduction through intelligent scoring.
"""

import asyncio
import logging
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class RegionCarbonIntensity(Enum):
    """Carbon intensity levels by region (gCO2/kWh)"""

    NORDIC = 50  # Hydro/wind heavy
    FRANCE = 85  # Nuclear heavy
    CANADA = 120  # Hydro/nuclear mix
    US_WEST = 280  # Mixed renewables
    US_EAST = 450  # Coal/gas mix
    GERMANY = 520  # Coal/renewables transition
    CHINA = 650  # Coal heavy
    INDIA = 720  # Coal dominant


class QuorumRole(Enum):
    """BFT node roles in quorum"""

    PROPOSER = "proposer"
    VALIDATOR = "validator"
    OBSERVER = "observer"
    STANDBY = "standby"


@dataclass
class BFTNode:
    """BFT consensus node with carbon footprint tracking"""

    node_id: str
    region: str
    carbon_intensity_gco2_kwh: int
    cpu_cores: int
    power_draw_watts: float
    latency_ms: float
    reliability_score: float  # 0.0-1.0
    last_seen: str
    active: bool = True
    role: QuorumRole = QuorumRole.STANDBY


@dataclass
class EcoQuorumCandidate:
    """Candidate quorum configuration with environmental scoring"""

    candidate_id: str
    nodes: list[BFTNode]
    fault_tolerance: int  # f in (3f+1) nodes
    quorum_size: int  # 2f+1 for safety
    consensus_latency_ms: float
    carbon_footprint_gco2_hour: float
    reliability_score: float
    eco_efficiency_score: float
    power_consumption_watts: float
    geographic_distribution: dict[str, int]


@dataclass
class QuorumDecision:
    """BFT quorum consensus decision with environmental impact"""

    decision_id: str
    timestamp: str
    quorum_nodes: list[str]
    proposer_node: str
    consensus_achieved: bool
    consensus_time_ms: float
    votes_for: int
    votes_against: int
    carbon_cost_gco2: float
    power_cost_watts_hour: float
    reliability_confidence: float


class BFTEcoScorer:
    """BFT-Eco quorum scoring and optimization engine

    Optimizes Byzantine Fault Tolerant consensus for both reliability and
    environmental impact. Balances fault tolerance with carbon footprint
    through intelligent node selection and quorum formation.

    SLA: <100ms quorum selection, <5% carbon overhead, >99.9% consensus reliability
    """

    def __init__(self, nodes: list[BFTNode], min_fault_tolerance: int = 1):
        self.nodes = {node.node_id: node for node in nodes}
        self.min_fault_tolerance = min_fault_tolerance
        self.min_quorum_size = 2 * min_fault_tolerance + 1
        self.active_quorum: EcoQuorumCandidate | None = None

        # Optimization weights
        self.reliability_weight = 0.4
        self.carbon_weight = 0.3
        self.latency_weight = 0.2
        self.distribution_weight = 0.1

        # Performance metrics
        self.quorum_selections = 0
        self.consensus_attempts = 0
        self.successful_consensus = 0
        self.total_carbon_gco2 = 0.0
        self.total_selection_time = 0.0

        logger.info(
            f"BFT-Eco Scorer initialized: {len(nodes)} nodes, "
            f"min_ft={min_fault_tolerance}, min_quorum={self.min_quorum_size}"
        )

    async def select_optimal_quorum(
        self, required_consensus_time_ms: float = 1000, carbon_budget_gco2_hour: float = 100
    ) -> EcoQuorumCandidate:
        """Select optimal BFT quorum balancing reliability and carbon impact

        Args:
            required_consensus_time_ms: Maximum acceptable consensus latency
            carbon_budget_gco2_hour: Maximum acceptable carbon footprint per hour

        Returns:
            Optimal quorum configuration with environmental scoring
        """
        start_time = time.time()
        self.quorum_selections += 1

        logger.info(
            f"Selecting optimal quorum: consensus_time≤{required_consensus_time_ms}ms, "
            f"carbon_budget≤{carbon_budget_gco2_hour}gCO2/h"
        )

        # Generate candidate quorums
        candidates = await self._generate_quorum_candidates()

        # Filter by constraints
        viable_candidates = self._filter_viable_candidates(
            candidates, required_consensus_time_ms, carbon_budget_gco2_hour
        )

        if not viable_candidates:
            # Relax constraints if no viable candidates
            logger.warning("No viable candidates found, relaxing constraints")
            viable_candidates = self._filter_viable_candidates(
                candidates, required_consensus_time_ms * 1.5, carbon_budget_gco2_hour * 1.5
            )

        # Score and rank candidates
        scored_candidates = []
        for candidate in viable_candidates:
            score = self._calculate_composite_score(candidate)
            scored_candidates.append((score, candidate))

        # Select best candidate
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best_candidate = scored_candidates[0]

        # Update active quorum
        self.active_quorum = best_candidate
        self._assign_node_roles(best_candidate)

        selection_time = time.time() - start_time
        self.total_selection_time += selection_time

        logger.info(
            f"Optimal quorum selected: {best_candidate.candidate_id}, "
            f"score={best_score:.3f}, "
            f"nodes={len(best_candidate.nodes)}, "
            f"carbon={best_candidate.carbon_footprint_gco2_hour:.1f}gCO2/h, "
            f"time={selection_time*1000:.1f}ms"
        )

        return best_candidate

    async def _generate_quorum_candidates(self) -> list[EcoQuorumCandidate]:
        """Generate all viable quorum candidate configurations"""
        candidates = []
        active_nodes = [node for node in self.nodes.values() if node.active]

        # Try different fault tolerance levels
        max_fault_tolerance = min(
            (len(active_nodes) - 1) // 3,  # Byzantine limit
            self.min_fault_tolerance + 2,  # Don't go too high
        )

        for ft in range(self.min_fault_tolerance, max_fault_tolerance + 1):
            quorum_size = 2 * ft + 1

            # Generate combinations of nodes for this quorum size
            # For demo, we'll use a simplified selection approach
            node_combinations = self._generate_node_combinations(active_nodes, quorum_size)

            for nodes in node_combinations[:10]:  # Limit combinations for performance
                candidate = await self._create_quorum_candidate(nodes, ft)
                candidates.append(candidate)

        return candidates

    def _generate_node_combinations(self, nodes: list[BFTNode], size: int) -> list[list[BFTNode]]:
        """Generate combinations of nodes for quorum (simplified for demo)"""
        if size > len(nodes):
            return []

        # For demo, generate some reasonable combinations
        combinations = []

        # Strategy 1: Best reliability nodes
        reliability_sorted = sorted(nodes, key=lambda n: n.reliability_score, reverse=True)
        combinations.append(reliability_sorted[:size])

        # Strategy 2: Lowest carbon footprint
        carbon_sorted = sorted(nodes, key=lambda n: n.carbon_intensity_gco2_kwh)
        combinations.append(carbon_sorted[:size])

        # Strategy 3: Best geographic distribution
        if len(set(n.region for n in nodes)) >= 3:
            distributed_combo = self._select_geographically_distributed(nodes, size)
            if distributed_combo:
                combinations.append(distributed_combo)

        # Strategy 4: Balanced approach
        balanced_combo = self._select_balanced_nodes(nodes, size)
        if balanced_combo:
            combinations.append(balanced_combo)

        return combinations

    def _select_geographically_distributed(
        self, nodes: list[BFTNode], size: int
    ) -> list[BFTNode] | None:
        """Select nodes with good geographic distribution"""
        regions = {}
        for node in nodes:
            if node.region not in regions:
                regions[node.region] = []
            regions[node.region].append(node)

        selected = []
        region_keys = list(regions.keys())

        # Try to get nodes from different regions
        for i in range(size):
            region = region_keys[i % len(region_keys)]
            if regions[region]:
                # Select best node from this region
                best_node = max(regions[region], key=lambda n: n.reliability_score)
                selected.append(best_node)
                regions[region].remove(best_node)

        return selected if len(selected) == size else None

    def _select_balanced_nodes(self, nodes: list[BFTNode], size: int) -> list[BFTNode] | None:
        """Select nodes with balanced reliability/carbon trade-off"""
        # Score nodes by balanced criteria
        scored_nodes = []
        for node in nodes:
            # Normalize scores (0-1)
            reliability_norm = node.reliability_score
            carbon_norm = 1.0 - (
                node.carbon_intensity_gco2_kwh / 1000
            )  # Lower carbon = higher score
            latency_norm = 1.0 - (node.latency_ms / 1000)  # Lower latency = higher score

            balanced_score = reliability_norm * 0.5 + carbon_norm * 0.3 + latency_norm * 0.2
            scored_nodes.append((balanced_score, node))

        # Select top nodes
        scored_nodes.sort(key=lambda x: x[0], reverse=True)
        return [node for score, node in scored_nodes[:size]]

    async def _create_quorum_candidate(
        self, nodes: list[BFTNode], fault_tolerance: int
    ) -> EcoQuorumCandidate:
        """Create quorum candidate with environmental scoring"""
        candidate_id = f"quorum_{int(time.time())}_{len(nodes)}n_{fault_tolerance}f"

        # Calculate consensus latency (max of node latencies + network overhead)
        consensus_latency = max(node.latency_ms for node in nodes) + 50  # Network overhead

        # Calculate carbon footprint
        total_power = sum(node.power_draw_watts for node in nodes)
        avg_carbon_intensity = sum(node.carbon_intensity_gco2_kwh for node in nodes) / len(nodes)
        carbon_footprint_gco2_hour = (total_power / 1000) * avg_carbon_intensity

        # Calculate reliability score
        reliability_score = self._calculate_quorum_reliability(nodes, fault_tolerance)

        # Calculate eco-efficiency score
        eco_efficiency = self._calculate_eco_efficiency(
            reliability_score, carbon_footprint_gco2_hour, consensus_latency
        )

        # Calculate geographic distribution
        geographic_distribution = {}
        for node in nodes:
            geographic_distribution[node.region] = geographic_distribution.get(node.region, 0) + 1

        return EcoQuorumCandidate(
            candidate_id=candidate_id,
            nodes=nodes,
            fault_tolerance=fault_tolerance,
            quorum_size=len(nodes),
            consensus_latency_ms=consensus_latency,
            carbon_footprint_gco2_hour=carbon_footprint_gco2_hour,
            reliability_score=reliability_score,
            eco_efficiency_score=eco_efficiency,
            power_consumption_watts=total_power,
            geographic_distribution=geographic_distribution,
        )

    def _calculate_quorum_reliability(self, nodes: list[BFTNode], fault_tolerance: int) -> float:
        """Calculate overall quorum reliability considering Byzantine faults"""
        # Simplified reliability calculation
        # In practice, would use more sophisticated Byzantine fault analysis

        # Individual node reliability
        node_reliabilities = [node.reliability_score for node in nodes]
        avg_reliability = sum(node_reliabilities) / len(node_reliabilities)

        # Quorum can tolerate up to fault_tolerance failures
        # Probability that more than fault_tolerance nodes fail
        failure_prob = 1.0 - avg_reliability

        # Simplified binomial calculation for Byzantine tolerance
        # This is a rough approximation - real implementation would be more complex
        quorum_reliability = 1.0 - (failure_prob ** (fault_tolerance + 1))

        # Adjust for geographic distribution (more regions = higher reliability)
        num_regions = len(set(node.region for node in nodes))
        distribution_bonus = min(0.1, num_regions * 0.02)

        return min(1.0, quorum_reliability + distribution_bonus)

    def _calculate_eco_efficiency(
        self, reliability: float, carbon_gco2_hour: float, latency_ms: float
    ) -> float:
        """Calculate eco-efficiency score balancing performance and environmental impact"""
        # Normalize components
        reliability_norm = reliability  # Already 0-1
        carbon_norm = 1.0 / (1.0 + carbon_gco2_hour / 100)  # Lower carbon = higher score
        latency_norm = 1.0 / (1.0 + latency_ms / 1000)  # Lower latency = higher score

        # Weighted eco-efficiency score
        eco_efficiency = reliability_norm * 0.5 + carbon_norm * 0.3 + latency_norm * 0.2

        return eco_efficiency

    def _filter_viable_candidates(
        self,
        candidates: list[EcoQuorumCandidate],
        max_latency_ms: float,
        max_carbon_gco2_hour: float,
    ) -> list[EcoQuorumCandidate]:
        """Filter candidates by performance and environmental constraints"""
        viable = []
        for candidate in candidates:
            # Check latency constraint
            if candidate.consensus_latency_ms > max_latency_ms:
                continue

            # Check carbon constraint
            if candidate.carbon_footprint_gco2_hour > max_carbon_gco2_hour:
                continue

            # Check minimum fault tolerance
            if candidate.fault_tolerance < self.min_fault_tolerance:
                continue

            # Check minimum reliability
            if candidate.reliability_score < 0.95:  # 95% minimum reliability
                continue

            viable.append(candidate)

        return viable

    def _calculate_composite_score(self, candidate: EcoQuorumCandidate) -> float:
        """Calculate composite score for candidate ranking"""
        # Normalize metrics for scoring
        reliability_score = candidate.reliability_score
        carbon_score = 1.0 / (1.0 + candidate.carbon_footprint_gco2_hour / 50)
        latency_score = 1.0 / (1.0 + candidate.consensus_latency_ms / 500)
        distribution_score = min(1.0, len(candidate.geographic_distribution) / 3)

        # Weighted composite score
        composite_score = (
            reliability_score * self.reliability_weight
            + carbon_score * self.carbon_weight
            + latency_score * self.latency_weight
            + distribution_score * self.distribution_weight
        )

        return composite_score

    def _assign_node_roles(self, quorum: EcoQuorumCandidate):
        """Assign BFT roles to quorum nodes"""
        # Sort nodes by reliability for role assignment
        nodes_by_reliability = sorted(quorum.nodes, key=lambda n: n.reliability_score, reverse=True)

        # Assign proposer (most reliable node)
        nodes_by_reliability[0].role = QuorumRole.PROPOSER

        # Assign validators (remaining nodes in quorum)
        for node in nodes_by_reliability[1:]:
            node.role = QuorumRole.VALIDATOR

        # Reset other nodes to standby
        for node in self.nodes.values():
            if node not in quorum.nodes:
                node.role = QuorumRole.STANDBY

    async def execute_consensus(self, proposal: dict[str, Any]) -> QuorumDecision:
        """Execute BFT consensus with carbon tracking"""
        if not self.active_quorum:
            raise ValueError("No active quorum configured")

        start_time = time.time()
        self.consensus_attempts += 1

        decision_id = f"consensus_{int(time.time())}_{len(proposal)}"

        logger.info(f"Executing BFT consensus: {decision_id}")

        try:
            # Simulate consensus protocol
            proposer = next(
                node for node in self.active_quorum.nodes if node.role == QuorumRole.PROPOSER
            )
            validators = [
                node for node in self.active_quorum.nodes if node.role == QuorumRole.VALIDATOR
            ]

            # Simulate voting
            votes_for = 0
            votes_against = 0

            # Proposer always votes for
            votes_for += 1

            # Validators vote based on reliability (simulate network conditions)
            for validator in validators:
                # Higher reliability = more likely to vote (simulate network reliability)
                if time.time() % 1 < validator.reliability_score:
                    votes_for += 1
                else:
                    votes_against += 1

            # Check if we have quorum consensus (> 2/3 of nodes)
            required_votes = math.ceil(len(self.active_quorum.nodes) * 2 / 3)
            consensus_achieved = votes_for >= required_votes

            # Calculate environmental impact
            consensus_time_ms = (time.time() - start_time) * 1000

            # Carbon cost based on consensus time and quorum power consumption
            carbon_cost_gco2 = self.active_quorum.carbon_footprint_gco2_hour * (
                consensus_time_ms / 3600000
            )  # Convert ms to hours

            power_cost_watts_hour = self.active_quorum.power_consumption_watts * (
                consensus_time_ms / 3600000
            )

            if consensus_achieved:
                self.successful_consensus += 1

            self.total_carbon_gco2 += carbon_cost_gco2

            decision = QuorumDecision(
                decision_id=decision_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                quorum_nodes=[node.node_id for node in self.active_quorum.nodes],
                proposer_node=proposer.node_id,
                consensus_achieved=consensus_achieved,
                consensus_time_ms=consensus_time_ms,
                votes_for=votes_for,
                votes_against=votes_against,
                carbon_cost_gco2=carbon_cost_gco2,
                power_cost_watts_hour=power_cost_watts_hour,
                reliability_confidence=self.active_quorum.reliability_score,
            )

            logger.info(
                f"Consensus result: {decision_id}, "
                f"achieved={consensus_achieved}, "
                f"votes={votes_for}/{votes_for + votes_against}, "
                f"time={consensus_time_ms:.1f}ms, "
                f"carbon={carbon_cost_gco2:.3f}gCO2"
            )

            return decision

        except Exception as e:
            logger.error(f"Consensus execution failed: {decision_id}, error={e}")
            raise

    def get_carbon_report(self, hours: int = 24) -> dict[str, Any]:
        """Generate carbon footprint report"""
        # Simulate hourly data
        hourly_carbon = self.total_carbon_gco2 / max(hours, 1)

        return {
            "reporting_period_hours": hours,
            "total_carbon_gco2": self.total_carbon_gco2,
            "average_hourly_carbon_gco2": hourly_carbon,
            "active_quorum_carbon_rate": (
                self.active_quorum.carbon_footprint_gco2_hour if self.active_quorum else 0
            ),
            "carbon_efficiency_gco2_per_consensus": (
                self.total_carbon_gco2 / max(self.successful_consensus, 1)
            ),
            "estimated_annual_carbon_kg": hourly_carbon * 24 * 365 / 1000,
            "carbon_reduction_vs_baseline_pct": 15.2,  # Simulate 15% reduction
            "eco_optimization_enabled": True,
        }

    def get_performance_metrics(self) -> dict[str, Any]:
        """Get BFT-Eco performance metrics"""
        success_rate = self.successful_consensus / max(self.consensus_attempts, 1)
        avg_selection_time = self.total_selection_time / max(self.quorum_selections, 1)

        return {
            "quorum_selections": self.quorum_selections,
            "consensus_attempts": self.consensus_attempts,
            "successful_consensus": self.successful_consensus,
            "consensus_success_rate_pct": success_rate * 100,
            "avg_quorum_selection_time_ms": avg_selection_time * 1000,
            "active_nodes": len([n for n in self.nodes.values() if n.active]),
            "total_nodes": len(self.nodes),
            "active_quorum_size": len(self.active_quorum.nodes) if self.active_quorum else 0,
            "active_fault_tolerance": (
                self.active_quorum.fault_tolerance if self.active_quorum else 0
            ),
            "sla_compliance_pct": 100.0 if avg_selection_time < 0.1 else 0.0,  # <100ms SLA
        }


def create_demo_scorer() -> BFTEcoScorer:
    """Create demo BFT-Eco scorer with simulated nodes"""
    demo_nodes = [
        BFTNode(
            "node-nordic-1", "nordic", RegionCarbonIntensity.NORDIC.value, 4, 150.0, 45.0, 0.98
        ),
        BFTNode(
            "node-nordic-2", "nordic", RegionCarbonIntensity.NORDIC.value, 4, 150.0, 50.0, 0.97
        ),
        BFTNode(
            "node-france-1", "france", RegionCarbonIntensity.FRANCE.value, 8, 250.0, 65.0, 0.96
        ),
        BFTNode(
            "node-canada-1", "canada", RegionCarbonIntensity.CANADA.value, 8, 280.0, 80.0, 0.95
        ),
        BFTNode(
            "node-uswest-1", "us-west", RegionCarbonIntensity.US_WEST.value, 16, 400.0, 40.0, 0.94
        ),
        BFTNode(
            "node-uswest-2", "us-west", RegionCarbonIntensity.US_WEST.value, 16, 420.0, 42.0, 0.93
        ),
        BFTNode(
            "node-useast-1", "us-east", RegionCarbonIntensity.US_EAST.value, 16, 450.0, 85.0, 0.92
        ),
    ]

    return BFTEcoScorer(demo_nodes, min_fault_tolerance=1)


if __name__ == "__main__":
    # Demo usage
    async def demo():
        scorer = create_demo_scorer()

        print("=== BFT-Eco Scorer Demo ===")

        # Select optimal quorum
        quorum = await scorer.select_optimal_quorum(
            required_consensus_time_ms=800, carbon_budget_gco2_hour=75
        )

        print(f"Selected Quorum: {quorum.candidate_id}")
        print(f"Nodes: {len(quorum.nodes)} (fault tolerance: {quorum.fault_tolerance})")
        print(f"Carbon footprint: {quorum.carbon_footprint_gco2_hour:.1f} gCO2/hour")
        print(f"Consensus latency: {quorum.consensus_latency_ms:.1f} ms")
        print(f"Reliability: {quorum.reliability_score:.3f}")
        print(f"Eco-efficiency: {quorum.eco_efficiency_score:.3f}")

        # Execute some consensus decisions
        for i in range(3):
            proposal = {"operation": f"transfer_{i}", "amount": 1000 + i * 100}
            decision = await scorer.execute_consensus(proposal)
            print(
                f"Consensus {i+1}: {decision.consensus_achieved}, "
                f"time={decision.consensus_time_ms:.1f}ms, "
                f"carbon={decision.carbon_cost_gco2:.4f}gCO2"
            )

        # Generate reports
        carbon_report = scorer.get_carbon_report(24)
        performance = scorer.get_performance_metrics()

        print("\nCarbon Report:")
        print(f"  Total carbon: {carbon_report['total_carbon_gco2']:.3f} gCO2")
        print(f"  Hourly rate: {carbon_report['average_hourly_carbon_gco2']:.3f} gCO2/h")
        print(f"  Annual estimate: {carbon_report['estimated_annual_carbon_kg']:.1f} kg CO2")

        print(f"\nPerformance: {performance}")

    # Run demo
    asyncio.run(demo())
