#!/usr/bin/env python3
"""
Maestro Auto-Canary v2 with Bayesian Analysis
Thompson sampling for promote/abort decisions with shadow evaluation
"""

import json
import logging
import random
import time
from dataclasses import dataclass

import numpy as np
from scipy.stats import beta


@dataclass
class Arm:
    """Beta-Bernoulli arm for multi-armed bandit"""

    name: str
    successes: int = 1  # vA (alpha parameter)
    failures: int = 1  # vB (beta parameter)

    def sample(self) -> float:
        """Sample from Beta distribution"""
        return np.random.beta(self.successes, self.failures)

    def update(self, reward: float) -> None:
        """Update arm based on reward (0.0 or 1.0)"""
        if reward > 0.5:
            self.successes += 1
        else:
            self.failures += 1

    def confidence_interval(self, confidence: float = 0.95) -> tuple[float, float]:
        """Calculate confidence interval for success rate"""
        alpha = 1 - confidence
        lower = beta.ppf(alpha / 2, self.successes, self.failures)
        upper = beta.ppf(1 - alpha / 2, self.successes, self.failures)
        return (lower, upper)

    @property
    def mean(self) -> float:
        """Expected success rate"""
        return self.successes / (self.successes + self.failures)


@dataclass
class CanaryMetrics:
    """Metrics for canary evaluation"""

    success_rate: float
    p95_latency: float
    error_rate: float
    cost_per_request: float
    throughput: float
    timestamp: float


@dataclass
class ShadowEvaluation:
    """Shadow evaluation results comparing canary vs baseline"""

    canary_metrics: CanaryMetrics
    baseline_metrics: CanaryMetrics
    sample_size: int
    statistical_significance: float
    effect_size: float


class BayesianCanaryController:
    """Bayesian canary deployment controller with Thompson sampling"""

    def __init__(
        self,
        success_threshold: float = 0.9,
        min_samples: int = 100,
        confidence_threshold: float = 0.95,
        cost_guard_enabled: bool = True,
    ):
        self.success_threshold = success_threshold
        self.min_samples = min_samples
        self.confidence_threshold = confidence_threshold
        self.cost_guard_enabled = cost_guard_enabled

        # Initialize arms
        self.canary_arm = Arm("canary")
        self.baseline_arm = Arm("baseline")

        # Shadow evaluation state
        self.shadow_evaluations: list[ShadowEvaluation] = []
        self.decision_history: list[dict] = []

        self.logger = logging.getLogger(__name__)

    def decide(
        self,
        canary_metrics: CanaryMetrics,
        baseline_metrics: CanaryMetrics,
        budget_remaining: float | None = None,
    ) -> dict:
        """Make promote/abort/continue decision using Bayesian analysis"""

        # Update arms with latest metrics
        canary_success = self._calculate_success_score(canary_metrics)
        baseline_success = self._calculate_success_score(baseline_metrics)

        self.canary_arm.update(canary_success)
        self.baseline_arm.update(baseline_success)

        # Sample from arms (Thompson Sampling)
        canary_sample = self.canary_arm.sample()
        baseline_sample = self.baseline_arm.sample()

        # Calculate confidence in canary being better
        canary_better_confidence = self._calculate_superiority_probability()

        # Check minimum sample size
        total_samples = self.canary_arm.successes + self.canary_arm.failures - 2
        if total_samples < self.min_samples:
            decision = "continue"
            reason = f"Insufficient samples: {total_samples}/{self.min_samples}"
        elif canary_better_confidence >= self.confidence_threshold:
            decision = "promote"
            reason = f"High confidence canary is better: {canary_better_confidence:.3f}"
        elif canary_better_confidence <= (1 - self.confidence_threshold):
            decision = "abort"
            reason = f"High confidence canary is worse: {canary_better_confidence:.3f}"
        else:
            decision = "continue"
            reason = f"Inconclusive evidence: {canary_better_confidence:.3f}"

        # Cost guard check
        if self.cost_guard_enabled and budget_remaining is not None:
            estimated_cost = self._estimate_remaining_cost(canary_metrics)
            if estimated_cost > budget_remaining:
                if decision == "continue":
                    decision = "abort"
                    reason = (
                        f"Cost guard triggered: ${estimated_cost:.2f} > ${budget_remaining:.2f}"
                    )

        # Build detailed decision response
        decision_data = {
            "decision": decision,
            "reason": reason,
            "confidence": canary_better_confidence,
            "canary_stats": {
                "mean": self.canary_arm.mean,
                "samples": total_samples,
                "confidence_interval": self.canary_arm.confidence_interval(),
                "latest_sample": canary_sample,
            },
            "baseline_stats": {
                "mean": self.baseline_arm.mean,
                "samples": self.baseline_arm.successes + self.baseline_arm.failures - 2,
                "confidence_interval": self.baseline_arm.confidence_interval(),
                "latest_sample": baseline_sample,
            },
            "metrics_comparison": {
                "success_rate_delta": canary_metrics.success_rate - baseline_metrics.success_rate,
                "latency_delta": canary_metrics.p95_latency - baseline_metrics.p95_latency,
                "cost_delta": canary_metrics.cost_per_request - baseline_metrics.cost_per_request,
                "error_rate_delta": canary_metrics.error_rate - baseline_metrics.error_rate,
            },
            "timestamp": time.time(),
        }

        # Log decision
        self.decision_history.append(decision_data)
        self.logger.info(f"Canary decision: {decision} ({reason})")

        return decision_data

    def _calculate_success_score(self, metrics: CanaryMetrics) -> float:
        """Calculate overall success score from metrics (0.0 to 1.0)"""
        # Weighted combination of metrics
        success_score = (
            metrics.success_rate * 0.4  # 40% weight on success rate
            + (1 - min(metrics.error_rate, 0.1)) * 0.3  # 30% weight on low error rate
            + (1 - min(metrics.p95_latency / 5000, 1.0)) * 0.2  # 20% weight on latency
            + (1 - min(metrics.cost_per_request / 0.1, 1.0)) * 0.1  # 10% weight on cost
        )
        return max(0.0, min(1.0, success_score))

    def _calculate_superiority_probability(self, n_samples: int = 10000) -> float:
        """Calculate probability that canary arm is better than baseline"""
        canary_samples = [self.canary_arm.sample() for _ in range(n_samples)]
        baseline_samples = [self.baseline_arm.sample() for _ in range(n_samples)]

        better_count = sum(c > b for c, b in zip(canary_samples, baseline_samples, strict=False))
        return better_count / n_samples

    def _estimate_remaining_cost(self, canary_metrics: CanaryMetrics) -> float:
        """Estimate cost to complete canary evaluation"""
        remaining_samples = max(
            0, self.min_samples - (self.canary_arm.successes + self.canary_arm.failures - 2)
        )
        return remaining_samples * canary_metrics.cost_per_request

    def run_shadow_evaluation(
        self, canary_traffic: float = 0.1, evaluation_window: int = 300
    ) -> ShadowEvaluation:
        """Run shadow evaluation with small traffic percentage"""

        # In a real implementation, this would:
        # 1. Route small percentage of traffic to canary
        # 2. Compare results against baseline
        # 3. Return statistical analysis

        # Simulated for demonstration
        canary_metrics = CanaryMetrics(
            success_rate=0.95 + random.uniform(-0.05, 0.05),
            p95_latency=1200 + random.uniform(-200, 200),
            error_rate=0.02 + random.uniform(-0.01, 0.01),
            cost_per_request=0.005 + random.uniform(-0.001, 0.001),
            throughput=100 + random.uniform(-10, 10),
            timestamp=time.time(),
        )

        baseline_metrics = CanaryMetrics(
            success_rate=0.93,
            p95_latency=1400,
            error_rate=0.025,
            cost_per_request=0.006,
            throughput=95,
            timestamp=time.time(),
        )

        # Calculate statistical significance (simplified)
        sample_size = int(evaluation_window * canary_traffic * 10)  # Estimate
        effect_size = abs(canary_metrics.success_rate - baseline_metrics.success_rate)
        significance = min(0.95, effect_size * sample_size / 100)  # Simplified

        shadow_eval = ShadowEvaluation(
            canary_metrics=canary_metrics,
            baseline_metrics=baseline_metrics,
            sample_size=sample_size,
            statistical_significance=significance,
            effect_size=effect_size,
        )

        self.shadow_evaluations.append(shadow_eval)
        return shadow_eval

    def get_audit_report(self) -> dict:
        """Generate audit report of all canary decisions"""
        total_decisions = len(self.decision_history)
        if total_decisions == 0:
            return {"error": "No decisions made yet"}

        decisions_by_type = {}
        for decision_data in self.decision_history:
            decision_type = decision_data["decision"]
            decisions_by_type[decision_type] = decisions_by_type.get(decision_type, 0) + 1

        recent_confidence = [d["confidence"] for d in self.decision_history[-10:]]
        avg_confidence = sum(recent_confidence) / len(recent_confidence) if recent_confidence else 0

        return {
            "total_decisions": total_decisions,
            "decisions_breakdown": decisions_by_type,
            "average_confidence": avg_confidence,
            "canary_success_rate": self.canary_arm.mean,
            "baseline_success_rate": self.baseline_arm.mean,
            "shadow_evaluations_count": len(self.shadow_evaluations),
            "last_decision": self.decision_history[-1] if self.decision_history else None,
            "arm_statistics": {
                "canary": {
                    "successes": self.canary_arm.successes,
                    "failures": self.canary_arm.failures,
                    "mean": self.canary_arm.mean,
                    "confidence_interval": self.canary_arm.confidence_interval(),
                },
                "baseline": {
                    "successes": self.baseline_arm.successes,
                    "failures": self.baseline_arm.failures,
                    "mean": self.baseline_arm.mean,
                    "confidence_interval": self.baseline_arm.confidence_interval(),
                },
            },
        }

    def reset(self):
        """Reset controller state for new canary deployment"""
        self.canary_arm = Arm("canary")
        self.baseline_arm = Arm("baseline")
        self.shadow_evaluations = []
        # Keep decision history for learning


# Example usage and testing
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)

    # Create controller
    controller = BayesianCanaryController()

    # Simulate canary evaluation
    print("🚀 Starting Bayesian Canary Evaluation")
    print("=" * 50)

    for i in range(20):
        # Simulate metrics (canary gradually improving)
        canary_base_success = 0.90 + (i * 0.005)  # Improving over time
        baseline_success = 0.88

        canary_metrics = CanaryMetrics(
            success_rate=canary_base_success + random.uniform(-0.02, 0.02),
            p95_latency=1200 + random.uniform(-100, 100),
            error_rate=0.02 + random.uniform(-0.005, 0.005),
            cost_per_request=0.005,
            throughput=100,
            timestamp=time.time(),
        )

        baseline_metrics = CanaryMetrics(
            success_rate=baseline_success + random.uniform(-0.01, 0.01),
            p95_latency=1400 + random.uniform(-50, 50),
            error_rate=0.025 + random.uniform(-0.003, 0.003),
            cost_per_request=0.006,
            throughput=95,
            timestamp=time.time(),
        )

        # Make decision
        decision_data = controller.decide(canary_metrics, baseline_metrics, budget_remaining=50.0)

        print(
            f"Iteration {i+1:2d}: {decision_data['decision'].upper():<8} "
            f"(confidence: {decision_data['confidence']:.3f}) - {decision_data['reason']}"
        )

        if decision_data["decision"] in ["promote", "abort"]:
            print("\n🎯 Final decision reached!")
            break

    # Print final audit report
    print("\n📊 Audit Report:")
    print("=" * 50)
    audit = controller.get_audit_report()
    print(json.dumps(audit, indent=2, default=str))
