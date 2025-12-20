"""
Predictive Threat Suite - Counterfactual Simulator Service

Provides sophisticated counterfactual scenario simulation with causal modeling.
Supports what-if analysis for threat response strategies.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Literal, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np

logger = logging.getLogger(__name__)


class ThreatLevel(str, Enum):
    """Threat severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InterventionType(str, Enum):
    """Types of interventions that can be simulated."""
    DEPLOY_PATCH = "deploy_patch"
    RATE_LIMIT = "rate_limit"
    SCALE_UP = "scale_up"
    CIRCUIT_BREAKER = "circuit_breaker"
    TRAFFIC_SHIFT = "traffic_shift"
    ROLLBACK = "rollback"
    DO_NOTHING = "do_nothing"


class ImpactLevel(str, Enum):
    """Impact assessment levels."""
    HIGHLY_POSITIVE = "highly_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    HIGHLY_NEGATIVE = "highly_negative"


@dataclass
class CurrentState:
    """Current system state for simulation."""
    threat_level: ThreatLevel
    error_rate: float  # 0-1
    latency_p95: float  # milliseconds
    request_rate: float  # requests per second
    resource_utilization: float  # 0-1


@dataclass
class InterventionParameters:
    """Parameters for an intervention."""
    type: InterventionType
    timing: str  # "immediate", "2h", "4h", etc.
    parameters: dict[str, Any]


@dataclass
class OutcomeMetrics:
    """Predicted outcome metrics after intervention."""
    threat_escalation_probability: float  # 0-1
    expected_error_rate: float  # 0-1
    expected_latency_p95: float  # milliseconds
    expected_availability: float  # 0-1
    risk_reduction: float  # 0-1 (compared to baseline)


@dataclass
class InterventionOutcome:
    """Outcome of a specific intervention."""
    intervention_id: str
    intervention_type: InterventionType
    probability: float  # Probability of this outcome
    impact: OutcomeMetrics
    confidence: float  # 0-1
    cost_estimate: float  # Relative cost (0-1)
    time_to_effect: int  # Minutes until intervention takes effect


@dataclass
class Recommendation:
    """Recommended action based on simulation."""
    action: InterventionType
    priority: str  # "low", "medium", "high", "critical"
    reasoning: str
    expected_benefit: float  # 0-1


@dataclass
class SimulationResult:
    """Complete simulation result."""
    scenario_id: str
    entity_id: str
    generated_at: datetime
    baseline_outcome: OutcomeMetrics
    intervention_outcomes: list[InterventionOutcome]
    recommendation: Recommendation


class CausalModel:
    """
    Simplified causal model for threat scenario simulation.

    In production, this would use causal inference libraries like DoWhy or CausalML.
    For alpha, we implement a rule-based causal model with probabilistic outcomes.
    """

    def __init__(self):
        # Causal weights for different factors
        self.weights = {
            "threat_level_impact": 0.4,
            "error_rate_impact": 0.25,
            "latency_impact": 0.20,
            "resource_impact": 0.15,
        }

        # Intervention effectiveness (baseline probabilities)
        self.intervention_effectiveness = {
            InterventionType.DEPLOY_PATCH: {
                "threat_reduction": 0.70,
                "error_reduction": 0.60,
                "latency_improvement": 0.40,
                "cost": 0.50,
                "time_to_effect": 30,
            },
            InterventionType.RATE_LIMIT: {
                "threat_reduction": 0.40,
                "error_reduction": 0.30,
                "latency_improvement": 0.60,
                "cost": 0.20,
                "time_to_effect": 5,
            },
            InterventionType.SCALE_UP: {
                "threat_reduction": 0.30,
                "error_reduction": 0.50,
                "latency_improvement": 0.70,
                "cost": 0.70,
                "time_to_effect": 10,
            },
            InterventionType.CIRCUIT_BREAKER: {
                "threat_reduction": 0.50,
                "error_reduction": 0.70,
                "latency_improvement": 0.30,
                "cost": 0.30,
                "time_to_effect": 2,
            },
            InterventionType.TRAFFIC_SHIFT: {
                "threat_reduction": 0.60,
                "error_reduction": 0.40,
                "latency_improvement": 0.50,
                "cost": 0.40,
                "time_to_effect": 15,
            },
            InterventionType.ROLLBACK: {
                "threat_reduction": 0.80,
                "error_reduction": 0.80,
                "latency_improvement": 0.60,
                "cost": 0.60,
                "time_to_effect": 20,
            },
            InterventionType.DO_NOTHING: {
                "threat_reduction": 0.0,
                "error_reduction": 0.0,
                "latency_improvement": 0.0,
                "cost": 0.0,
                "time_to_effect": 0,
            },
        }

    def _threat_level_to_score(self, level: ThreatLevel) -> float:
        """Convert threat level to numerical score."""
        scores = {
            ThreatLevel.LOW: 0.2,
            ThreatLevel.MEDIUM: 0.5,
            ThreatLevel.HIGH: 0.8,
            ThreatLevel.CRITICAL: 1.0,
        }
        return scores[level]

    def simulate_baseline(self, state: CurrentState) -> OutcomeMetrics:
        """
        Simulate baseline outcome without intervention.

        Args:
            state: Current system state

        Returns:
            Predicted baseline outcome metrics
        """
        threat_score = self._threat_level_to_score(state.threat_level)

        # Baseline escalation probability based on current state
        escalation_prob = (
            threat_score * self.weights["threat_level_impact"] +
            state.error_rate * self.weights["error_rate_impact"] +
            (state.latency_p95 / 1000) * self.weights["latency_impact"] +
            state.resource_utilization * self.weights["resource_impact"]
        )
        escalation_prob = min(escalation_prob, 1.0)

        # Project future metrics assuming deterioration
        deterioration_factor = 1.0 + (escalation_prob * 0.5)

        expected_error_rate = min(state.error_rate * deterioration_factor, 1.0)
        expected_latency = state.latency_p95 * deterioration_factor
        expected_availability = 1.0 - expected_error_rate

        return OutcomeMetrics(
            threat_escalation_probability=escalation_prob,
            expected_error_rate=expected_error_rate,
            expected_latency_p95=expected_latency,
            expected_availability=expected_availability,
            risk_reduction=0.0
        )

    def simulate_intervention(
        self,
        state: CurrentState,
        intervention: InterventionParameters,
        baseline: OutcomeMetrics
    ) -> InterventionOutcome:
        """
        Simulate outcome of a specific intervention.

        Args:
            state: Current system state
            intervention: Intervention to simulate
            baseline: Baseline outcome without intervention

        Returns:
            Predicted intervention outcome
        """
        effectiveness = self.intervention_effectiveness[intervention.type]

        # Calculate intervention impact
        threat_reduction = effectiveness["threat_reduction"]
        error_reduction = effectiveness["error_reduction"]
        latency_improvement = effectiveness["latency_improvement"]

        # Apply intervention effects
        new_threat_prob = baseline.threat_escalation_probability * (1 - threat_reduction)
        new_error_rate = baseline.expected_error_rate * (1 - error_reduction)
        new_latency = baseline.expected_latency_p95 * (1 - latency_improvement)
        new_availability = 1.0 - new_error_rate

        # Calculate risk reduction
        risk_reduction = baseline.threat_escalation_probability - new_threat_prob

        # Calculate success probability
        # Higher for more severe threats (more benefit), adjusted by state
        severity_factor = self._threat_level_to_score(state.threat_level)
        success_probability = 0.5 + (severity_factor * threat_reduction * 0.4)
        success_probability = min(success_probability, 0.95)

        # Calculate confidence based on intervention type and state
        confidence = 0.7 + (threat_reduction * 0.2)  # More effective = more confident
        if state.error_rate > 0.1:  # Less confident in high-error states
            confidence *= 0.9

        outcome_metrics = OutcomeMetrics(
            threat_escalation_probability=new_threat_prob,
            expected_error_rate=new_error_rate,
            expected_latency_p95=new_latency,
            expected_availability=new_availability,
            risk_reduction=risk_reduction
        )

        return InterventionOutcome(
            intervention_id=f"{intervention.type.value}_{datetime.utcnow().timestamp()}",
            intervention_type=intervention.type,
            probability=success_probability,
            impact=outcome_metrics,
            confidence=confidence,
            cost_estimate=effectiveness["cost"],
            time_to_effect=effectiveness["time_to_effect"]
        )


class CounterfactualService:
    """
    Main service for counterfactual simulation.
    """

    def __init__(self):
        self.causal_model = CausalModel()

    def _generate_recommendation(
        self,
        baseline: OutcomeMetrics,
        outcomes: list[InterventionOutcome]
    ) -> Recommendation:
        """
        Generate recommendation based on simulation outcomes.

        Args:
            baseline: Baseline outcome
            outcomes: List of intervention outcomes

        Returns:
            Recommendation for best action
        """
        # Score each intervention
        scored_outcomes = []
        for outcome in outcomes:
            # Benefit score: risk reduction weighted by confidence, minus cost
            benefit = (
                outcome.impact.risk_reduction * outcome.confidence * 100
                - outcome.cost_estimate * 10
            )
            scored_outcomes.append((benefit, outcome))

        # Sort by benefit (descending)
        scored_outcomes.sort(key=lambda x: x[0], reverse=True)

        if not scored_outcomes:
            return Recommendation(
                action=InterventionType.DO_NOTHING,
                priority="low",
                reasoning="No interventions available",
                expected_benefit=0.0
            )

        best_benefit, best_outcome = scored_outcomes[0]

        # Determine priority based on baseline threat and benefit
        if baseline.threat_escalation_probability > 0.7 and best_benefit > 50:
            priority = "critical"
        elif baseline.threat_escalation_probability > 0.5 and best_benefit > 30:
            priority = "high"
        elif best_benefit > 15:
            priority = "medium"
        else:
            priority = "low"

        reasoning = (
            f"{best_outcome.impact.risk_reduction*100:.0f}% risk reduction "
            f"with {best_outcome.confidence*100:.0f}% confidence, "
            f"effect in {best_outcome.time_to_effect}min"
        )

        return Recommendation(
            action=best_outcome.intervention_type,
            priority=priority,
            reasoning=reasoning,
            expected_benefit=best_benefit / 100
        )

    def simulate_scenario(
        self,
        entity_id: str,
        current_state: CurrentState,
        interventions: list[InterventionParameters],
        timeframe: str = "24h"
    ) -> SimulationResult:
        """
        Simulate a scenario with multiple intervention options.

        Args:
            entity_id: Entity identifier
            current_state: Current system state
            interventions: List of interventions to simulate
            timeframe: Simulation timeframe

        Returns:
            Complete simulation result with recommendations
        """
        logger.info(
            f"Simulating counterfactual scenario for {entity_id} "
            f"with {len(interventions)} interventions"
        )

        # Generate baseline (no intervention)
        baseline = self.causal_model.simulate_baseline(current_state)

        # Simulate each intervention
        intervention_outcomes = [
            self.causal_model.simulate_intervention(
                current_state,
                intervention,
                baseline
            )
            for intervention in interventions
        ]

        # Generate recommendation
        recommendation = self._generate_recommendation(baseline, intervention_outcomes)

        # Create simulation result
        scenario_id = f"sim_{entity_id}_{int(datetime.utcnow().timestamp())}"

        return SimulationResult(
            scenario_id=scenario_id,
            entity_id=entity_id,
            generated_at=datetime.utcnow(),
            baseline_outcome=baseline,
            intervention_outcomes=intervention_outcomes,
            recommendation=recommendation
        )

    def quick_simulate(
        self,
        entity_id: str,
        threat_level: ThreatLevel,
        error_rate: float,
        latency_p95: float
    ) -> SimulationResult:
        """
        Quick simulation with common interventions.

        Args:
            entity_id: Entity identifier
            threat_level: Current threat level
            error_rate: Current error rate (0-1)
            latency_p95: Current p95 latency (ms)

        Returns:
            Simulation result
        """
        # Create current state
        state = CurrentState(
            threat_level=threat_level,
            error_rate=error_rate,
            latency_p95=latency_p95,
            request_rate=100.0,  # Default
            resource_utilization=0.7  # Default
        )

        # Common interventions to test
        interventions = [
            InterventionParameters(
                type=InterventionType.DEPLOY_PATCH,
                timing="immediate",
                parameters={"rollout_percentage": 50}
            ),
            InterventionParameters(
                type=InterventionType.RATE_LIMIT,
                timing="immediate",
                parameters={"limit": 1000}
            ),
            InterventionParameters(
                type=InterventionType.CIRCUIT_BREAKER,
                timing="immediate",
                parameters={"error_threshold": 0.05}
            ),
            InterventionParameters(
                type=InterventionType.ROLLBACK,
                timing="immediate",
                parameters={}
            ),
        ]

        return self.simulate_scenario(entity_id, state, interventions)


# Example usage
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)

    # Create service
    service = CounterfactualService()

    # Simulate a high-threat scenario
    result = service.quick_simulate(
        entity_id="auth_service",
        threat_level=ThreatLevel.HIGH,
        error_rate=0.05,
        latency_p95=450.0
    )

    print(f"\nSimulation ID: {result.scenario_id}")
    print(f"Entity: {result.entity_id}")
    print(f"Generated at: {result.generated_at}")

    print(f"\nBaseline (no intervention):")
    print(f"  Threat escalation probability: {result.baseline_outcome.threat_escalation_probability*100:.1f}%")
    print(f"  Expected error rate: {result.baseline_outcome.expected_error_rate*100:.2f}%")
    print(f"  Expected latency p95: {result.baseline_outcome.expected_latency_p95:.0f}ms")

    print(f"\nIntervention outcomes:")
    for outcome in result.intervention_outcomes:
        print(f"\n  {outcome.intervention_type.value}:")
        print(f"    Success probability: {outcome.probability*100:.1f}%")
        print(f"    Risk reduction: {outcome.impact.risk_reduction*100:.1f}%")
        print(f"    Confidence: {outcome.confidence*100:.1f}%")
        print(f"    Cost: {outcome.cost_estimate*100:.0f}/100")
        print(f"    Time to effect: {outcome.time_to_effect} minutes")
        print(f"    New threat probability: {outcome.impact.threat_escalation_probability*100:.1f}%")

    print(f"\nRecommendation:")
    print(f"  Action: {result.recommendation.action.value}")
    print(f"  Priority: {result.recommendation.priority}")
    print(f"  Reasoning: {result.recommendation.reasoning}")
    print(f"  Expected benefit: {result.recommendation.expected_benefit*100:.0f}/100")
