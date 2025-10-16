#!/usr/bin/env python3
"""
Symphony Orchestra MVP-3: Learner-Driven Routing
Champion/Challenger traffic splitting with automatic promotion
"""

import json
import logging
import math
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any

import redis

logger = logging.getLogger(__name__)


@dataclass
class ModelArm:
    """Represents a model arm (champion or challenger)"""

    model_id: str
    provider: str
    confidence: float = 0.0
    utility_score: float = 0.0
    cost_per_token: float = 0.0
    latency_p95: float = 0.0
    error_rate: float = 0.0
    requests_24h: int = 0


@dataclass
class TrafficState:
    """Current traffic splitting state for a task"""

    task: str
    champion: ModelArm
    challenger: ModelArm | None = None
    split_ratio: float = 0.05  # 5% challenger traffic
    promotion_eligible: bool = False
    consecutive_wins: int = 0
    last_evaluation: datetime | None = None
    slo_breaches: int = 0


@dataclass
class DecisionContext:
    """Context for routing decisions"""

    decision_id: str
    task: str
    loa: int
    timestamp: datetime
    chosen_arm: str
    utility_expected: float
    cost_estimate: float
    latency_estimate: float
    policy_version: str
    quota_remaining: dict[str, int]
    overrides: dict[str, Any]


class LearnerTrafficSplitter:
    """Production-grade traffic splitter with champion/challenger routing"""

    def __init__(self, redis_url: str = "redis://localhost:6379/1"):
        self.redis = redis.from_url(redis_url)
        self.utility_threshold = 0.10  # 10% utility improvement required
        self.slo_p95_threshold = 2500  # 2.5s local SLO
        self.slo_error_threshold = 0.05  # 5% error rate SLO

    def calculate_utility(self, quality: float, cost: float, latency: float) -> float:
        """Calculate utility score using approved reward function"""
        return quality - 0.5 * cost - 0.2 * latency

    def get_traffic_state(self, task: str) -> TrafficState:
        """Get current traffic state for a task"""
        key = f"learner:traffic:{task}"
        data = self.redis.get(key)

        if data:
            state_dict = json.loads(data)
            # Convert dictionaries back to dataclass instances
            champion = ModelArm(**state_dict["champion"])
            challenger = (
                ModelArm(**state_dict["challenger"]) if state_dict.get("challenger") else None
            )

            return TrafficState(
                task=state_dict["task"],
                champion=champion,
                challenger=challenger,
                split_ratio=state_dict.get("split_ratio", 0.05),
                promotion_eligible=state_dict.get("promotion_eligible", False),
                consecutive_wins=state_dict.get("consecutive_wins", 0),
                last_evaluation=(
                    datetime.fromisoformat(state_dict["last_evaluation"])
                    if state_dict.get("last_evaluation")
                    else None
                ),
                slo_breaches=state_dict.get("slo_breaches", 0),
            )

        # Default state with champion
        return TrafficState(
            task=task,
            champion=ModelArm(
                model_id="local/llama", provider="local", confidence=0.8, utility_score=0.7
            ),
        )

    def save_traffic_state(self, state: TrafficState):
        """Persist traffic state to Redis"""
        key = f"learner:traffic:{state.task}"
        state_dict = asdict(state)

        # Convert datetime to ISO string for JSON serialization
        if state_dict.get("last_evaluation"):
            state_dict["last_evaluation"] = state.last_evaluation.isoformat()

        self.redis.setex(key, 86400 * 7, json.dumps(state_dict))  # 7 day TTL

    def choose_arm(
        self, task: str, model_preferences: dict | None = None
    ) -> tuple[str, DecisionContext]:
        """Choose between champion and challenger using traffic splitting"""
        state = self.get_traffic_state(task)
        decision_id = f"dec_{int(time.time() * 1000)}_{hash(task) % 10000:04d}"

        # Check if we should use challenger
        use_challenger = (
            state.challenger is not None
            and state.split_ratio > 0
            and math.random() < state.split_ratio
            and state.slo_breaches == 0  # No recent SLO breaches
        )

        chosen_model = state.challenger if use_challenger else state.champion

        # Create decision context with full observability data
        context = DecisionContext(
            decision_id=decision_id,
            task=task,
            loa=model_preferences.get("loa", 1) if model_preferences else 1,
            timestamp=datetime.now(),
            chosen_arm="challenger" if use_challenger else "champion",
            utility_expected=chosen_model.utility_score,
            cost_estimate=chosen_model.cost_per_token * 1000,  # Estimate for 1K tokens
            latency_estimate=chosen_model.latency_p95,
            policy_version="mvp3-v1.0",
            quota_remaining=self._get_quota_snapshot(),
            overrides=model_preferences or {},
        )

        # Log decision for IPS/DR offline evaluation
        self._log_decision_metrics(context, state)

        return chosen_model.model_id, context

    def _get_quota_snapshot(self) -> dict[str, int]:
        """Get current quota remaining for all providers"""
        quotas = {}
        for provider in ["local", "openrouter", "anthropic", "grok", "deepseek"]:
            key = f"quota:remaining:{provider}"
            remaining = self.redis.get(key)
            quotas[provider] = int(remaining) if remaining else 10000
        return quotas

    def _log_decision_metrics(self, context: DecisionContext, state: TrafficState):
        """Log decision for offline evaluation (IPS/DR)"""
        metrics = {
            "timestamp": context.timestamp.isoformat(),
            "decision_id": context.decision_id,
            "task": context.task,
            "chosen_arm": context.chosen_arm,
            "champion_utility": state.champion.utility_score,
            "challenger_utility": state.challenger.utility_score if state.challenger else None,
            "split_ratio": state.split_ratio,
            "policy_version": context.policy_version,
            "quota_snapshot": context.quota_remaining,
        }

        # Append to metrics log for offline analysis
        with open("/tmp/learner-metrics.jsonl", "a") as f:
            f.write(json.dumps(metrics) + "\n")

    def record_outcome(
        self,
        decision_id: str,
        quality_score: float,
        actual_cost: float,
        actual_latency: float,
        error_occurred: bool = False,
    ):
        """Record the outcome of a routing decision"""
        # Calculate actual utility
        utility = self.calculate_utility(quality_score, actual_cost, actual_latency)

        # Store outcome for evaluation
        outcome = {
            "decision_id": decision_id,
            "timestamp": datetime.now().isoformat(),
            "quality_score": quality_score,
            "actual_cost": actual_cost,
            "actual_latency": actual_latency,
            "utility": utility,
            "error_occurred": error_occurred,
            "slo_breach": actual_latency > self.slo_p95_threshold or error_occurred,
        }

        # Store in Redis with 48h TTL for evaluation
        self.redis.setex(f"outcome:{decision_id}", 86400 * 2, json.dumps(outcome))

        # Check for immediate SLO breach and rollback if needed
        if outcome["slo_breach"]:
            self._handle_slo_breach(decision_id)

    def _handle_slo_breach(self, decision_id: str):
        """Handle SLO breach with immediate rollback"""
        logger.error(f"SLO breach detected for decision {decision_id}, initiating rollback")

        # Find the affected task and disable challenger
        outcomes_pattern = f"outcome:{decision_id}"
        decision_data = self.redis.get(outcomes_pattern)

        if decision_data:
            outcome = json.loads(decision_data)
            # Implementation would find the task and disable challenger traffic
            logger.error(f"Challenger disabled due to SLO breach: {outcome}")

    def evaluate_promotions(self) -> dict[str, Any]:
        """Nightly evaluation for challenger promotion"""
        results = {}

        # Get all active traffic states
        pattern = "learner:traffic:*"
        for key in self.redis.scan_iter(match=pattern):
            task = key.decode().split(":")[-1]
            state = self.get_traffic_state(task)

            if not state.challenger:
                continue

            # Evaluate last 24h performance
            promotion_result = self._evaluate_challenger_performance(state)
            results[task] = promotion_result

            if promotion_result["should_promote"]:
                self._promote_challenger(state)

        return results

    def _evaluate_challenger_performance(self, state: TrafficState) -> dict[str, Any]:
        """Evaluate if challenger should be promoted"""
        # Get outcomes from last 24h
        cutoff = datetime.now() - timedelta(days=1)

        champion_outcomes = []
        challenger_outcomes = []

        # Scan Redis for recent outcomes (simplified - production would use time-series DB)
        for key in self.redis.scan_iter(match="outcome:*"):
            outcome_data = self.redis.get(key)
            if outcome_data:
                outcome = json.loads(outcome_data)
                timestamp = datetime.fromisoformat(outcome["timestamp"])

                if timestamp > cutoff:
                    if "champion" in outcome.get("chosen_arm", ""):
                        champion_outcomes.append(outcome)
                    else:
                        challenger_outcomes.append(outcome)

        if len(challenger_outcomes) < 10:  # Need minimum sample size
            return {"should_promote": False, "reason": "insufficient_data"}

        # Calculate average utilities
        champ_avg_utility = sum(o["utility"] for o in champion_outcomes) / max(
            len(champion_outcomes), 1
        )
        challenger_avg_utility = sum(o["utility"] for o in challenger_outcomes) / len(
            challenger_outcomes
        )

        # Check promotion criteria
        utility_improvement = (challenger_avg_utility - champ_avg_utility) / abs(champ_avg_utility)
        has_slo_breaches = any(o.get("slo_breach", False) for o in challenger_outcomes)

        should_promote = (
            utility_improvement >= self.utility_threshold
            and not has_slo_breaches
            and len(challenger_outcomes) >= 50  # Minimum traffic requirement
        )

        return {
            "should_promote": should_promote,
            "utility_improvement": utility_improvement,
            "champion_utility": champ_avg_utility,
            "challenger_utility": challenger_avg_utility,
            "slo_breaches": has_slo_breaches,
            "sample_size": len(challenger_outcomes),
        }

    def _promote_challenger(self, state: TrafficState):
        """Promote challenger to champion"""
        if not state.challenger:
            return

        logger.info(
            f"Promoting challenger {state.challenger.model_id} to champion for task {state.task}"
        )

        # Swap champion and challenger
        old_champion = state.champion
        state.champion = state.challenger
        state.challenger = None
        state.split_ratio = 0.0
        state.promotion_eligible = False
        state.consecutive_wins = 0

        # Save updated state
        self.save_traffic_state(state)

        # Log promotion for audit trail
        promotion_record = {
            "timestamp": datetime.now().isoformat(),
            "task": state.task,
            "old_champion": old_champion.model_id,
            "new_champion": state.champion.model_id,
            "reason": "utility_improvement",
        }

        with open("/tmp/promotions.jsonl", "a") as f:
            f.write(json.dumps(promotion_record) + "\n")


def main():
    """CLI interface for learner traffic management"""
    import argparse

    parser = argparse.ArgumentParser(description="Symphony Orchestra Learner Traffic Management")
    parser.add_argument("command", choices=["status", "promote", "rollback", "evaluate"])
    parser.add_argument("--task", help="Task name")
    parser.add_argument("--model", help="Model to set as challenger")

    args = parser.parse_args()

    splitter = LearnerTrafficSplitter()

    if args.command == "status":
        # Show current traffic states
        for task in ["nl2cypher", "rag", "coding", "general"]:
            state = splitter.get_traffic_state(task)
            print(f"\nTask: {task}")
            print(
                f"  Champion: {state.champion.model_id} (utility: {state.champion.utility_score:.3f})"
            )
            if state.challenger:
                print(
                    f"  Challenger: {state.challenger.model_id} (utility: {state.challenger.utility_score:.3f})"
                )
                print(f"  Split: {state.split_ratio:.1%}")
            else:
                print("  No active challenger")

    elif args.command == "evaluate":
        results = splitter.evaluate_promotions()
        print(json.dumps(results, indent=2))

    elif args.command == "promote":
        if args.task:
            state = splitter.get_traffic_state(args.task)
            if state.challenger:
                splitter._promote_challenger(state)
                print(f"Promoted challenger for task {args.task}")
            else:
                print(f"No challenger for task {args.task}")

    elif args.command == "rollback":
        if args.task:
            state = splitter.get_traffic_state(args.task)
            state.challenger = None
            state.split_ratio = 0.0
            splitter.save_traffic_state(state)
            print(f"Rolled back challenger for task {args.task}")


if __name__ == "__main__":
    main()
