#!/usr/bin/env python3
"""
MC Platform Autonomy Tier-3 Simulator for TENANT_003
Simulates computed operations with safety validation and evidence generation
"""

import argparse
import json
import random
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any


class AutonomyTier3Simulator:
    def __init__(self, tenant: str = "TENANT_003"):
        self.tenant = tenant
        self.simulation_id = str(uuid.uuid4())
        self.operation_log = []
        self.safety_violations = []
        self.compensation_events = []

        # Safety thresholds (v0.3.3 requirements)
        self.success_threshold = 99.9  # 99.9% success rate required
        self.compensation_threshold = 0.5  # ≤0.5% compensation rate
        self.max_operations = 1000  # Maximum operations to simulate

    def simulate_operation(self, operation_type: str, context: dict[str, Any]) -> dict[str, Any]:
        """Simulate a single Tier-3 autonomous operation"""

        operation_id = str(uuid.uuid4())
        start_time = datetime.utcnow()

        # Simulate operation execution time
        execution_time_ms = random.randint(50, 500)
        time.sleep(execution_time_ms / 1000.0)  # Convert to seconds

        # Determine operation outcome based on historical success rates
        success_rate = self._calculate_operation_success_rate(operation_type, context)
        operation_successful = random.random() < (success_rate / 100.0)

        # Check for policy violations
        policy_violation = self._check_policy_violations(operation_type, context)

        # Check for residency violations
        residency_violation = self._check_residency_violations(context)

        # Generate compensation event if needed
        compensation_required = False
        compensation_reason = None

        if not operation_successful:
            compensation_required = True
            compensation_reason = "operation_failed"
        elif policy_violation:
            compensation_required = True
            compensation_reason = "policy_violation"
        elif residency_violation:
            compensation_required = True
            compensation_reason = "residency_violation"

        operation_result = {
            "operation_id": operation_id,
            "tenant": self.tenant,
            "operation_type": operation_type,
            "timestamp": start_time.isoformat() + "Z",
            "execution_time_ms": execution_time_ms,
            "success": operation_successful and not policy_violation and not residency_violation,
            "context": context,
            "violations": {"policy": policy_violation, "residency": residency_violation},
            "compensation": {"required": compensation_required, "reason": compensation_reason},
            "metadata": {
                "simulation_id": self.simulation_id,
                "tier": "T3_COMPUTED",
                "safety_validated": True,
            },
        }

        # Log operation
        self.operation_log.append(operation_result)

        # Track violations and compensation
        if policy_violation or residency_violation:
            self.safety_violations.append(
                {
                    "operation_id": operation_id,
                    "violation_type": "policy" if policy_violation else "residency",
                    "timestamp": start_time.isoformat() + "Z",
                    "details": context,
                }
            )

        if compensation_required:
            self.compensation_events.append(
                {
                    "operation_id": operation_id,
                    "reason": compensation_reason,
                    "timestamp": start_time.isoformat() + "Z",
                    "impact_level": self._assess_compensation_impact(compensation_reason),
                }
            )

        return operation_result

    def _calculate_operation_success_rate(
        self, operation_type: str, context: dict[str, Any]
    ) -> float:
        """Calculate expected success rate for operation type"""

        base_rates = {
            "data_query": 99.8,
            "computed_write": 99.5,
            "data_aggregation": 99.9,
            "index_update": 99.7,
            "cache_refresh": 99.95,
            "derived_calculation": 99.6,
        }

        base_rate = base_rates.get(operation_type, 99.0)

        # Apply context-based adjustments
        if context.get("complexity", "low") == "high":
            base_rate -= 0.2

        if context.get("data_size", "small") == "large":
            base_rate -= 0.1

        # Add some randomness
        adjustment = random.uniform(-0.1, 0.1)
        return max(95.0, min(100.0, base_rate + adjustment))

    def _check_policy_violations(self, operation_type: str, context: dict[str, Any]) -> bool:
        """Check for OPA policy violations"""

        # Simulate policy evaluation (normally would call OPA)
        violation_probability = {
            "data_query": 0.001,  # 0.1% chance
            "computed_write": 0.005,  # 0.5% chance
            "data_aggregation": 0.002,
            "index_update": 0.003,
            "cache_refresh": 0.001,
            "derived_calculation": 0.002,
        }

        prob = violation_probability.get(operation_type, 0.002)

        # Increase probability for high-risk contexts
        if context.get("contains_pii", False):
            prob *= 5

        if context.get("cross_tenant", False):
            prob *= 3

        return random.random() < prob

    def _check_residency_violations(self, context: dict[str, Any]) -> bool:
        """Check for data residency violations"""

        # Simulate residency validation
        required_region = context.get("data_region", "us-east-1")
        processing_region = context.get("processing_region", "us-east-1")

        # Very low probability of residency violations in simulation
        if required_region != processing_region:
            return True

        # Random residency violation (should be extremely rare)
        return random.random() < 0.0001  # 0.01% chance

    def _assess_compensation_impact(self, reason: str) -> str:
        """Assess the impact level of compensation events"""

        impact_levels = {
            "operation_failed": "medium",
            "policy_violation": "high",
            "residency_violation": "critical",
        }

        return impact_levels.get(reason, "medium")

    def run_simulation(
        self, num_operations: int = 1000, operation_mix: dict[str, float] | None = None
    ) -> dict[str, Any]:
        """Run comprehensive Tier-3 simulation"""

        print(f"🤖 Starting Autonomy Tier-3 simulation for {self.tenant}")
        print(f"   Operations: {num_operations}")
        print(f"   Simulation ID: {self.simulation_id}")

        if operation_mix is None:
            operation_mix = {
                "data_query": 0.4,
                "computed_write": 0.2,
                "data_aggregation": 0.15,
                "index_update": 0.1,
                "cache_refresh": 0.1,
                "derived_calculation": 0.05,
            }

        start_time = datetime.utcnow()

        # Clear previous results
        self.operation_log = []
        self.safety_violations = []
        self.compensation_events = []

        # Run simulation
        for i in range(num_operations):
            if i % 100 == 0:
                print(f"   Progress: {i}/{num_operations} operations...")

            # Select operation type based on mix
            operation_type = self._select_operation_type(operation_mix)

            # Generate realistic context
            context = self._generate_operation_context(operation_type)

            # Execute simulated operation
            result = self.simulate_operation(operation_type, context)

        end_time = datetime.utcnow()
        simulation_duration = (end_time - start_time).total_seconds()

        # Calculate metrics
        total_operations = len(self.operation_log)
        successful_operations = sum(1 for op in self.operation_log if op["success"])
        failed_operations = total_operations - successful_operations

        success_rate = (
            (successful_operations / total_operations * 100) if total_operations > 0 else 0
        )
        compensation_rate = (
            (len(self.compensation_events) / total_operations * 100) if total_operations > 0 else 0
        )

        # Safety assessment
        safety_passed = (
            success_rate >= self.success_threshold
            and compensation_rate <= self.compensation_threshold
            and len([v for v in self.safety_violations if v["violation_type"] == "residency"]) == 0
        )

        simulation_results = {
            "simulation_metadata": {
                "simulation_id": self.simulation_id,
                "tenant": self.tenant,
                "start_time": start_time.isoformat() + "Z",
                "end_time": end_time.isoformat() + "Z",
                "duration_seconds": simulation_duration,
                "platform_version": "v0.3.3-mc",
                "tier": "T3_COMPUTED",
            },
            "configuration": {
                "target_operations": num_operations,
                "operation_mix": operation_mix,
                "success_threshold": self.success_threshold,
                "compensation_threshold": self.compensation_threshold,
            },
            "results": {
                "total_operations": total_operations,
                "successful_operations": successful_operations,
                "failed_operations": failed_operations,
                "success_rate_percent": success_rate,
                "compensation_events": len(self.compensation_events),
                "compensation_rate_percent": compensation_rate,
                "policy_violations": len(
                    [v for v in self.safety_violations if v["violation_type"] == "policy"]
                ),
                "residency_violations": len(
                    [v for v in self.safety_violations if v["violation_type"] == "residency"]
                ),
                "avg_execution_time_ms": (
                    sum(op["execution_time_ms"] for op in self.operation_log) / total_operations
                    if total_operations > 0
                    else 0
                ),
            },
            "safety_assessment": {
                "success_rate_meets_threshold": success_rate >= self.success_threshold,
                "compensation_rate_meets_threshold": compensation_rate
                <= self.compensation_threshold,
                "no_residency_violations": len(
                    [v for v in self.safety_violations if v["violation_type"] == "residency"]
                )
                == 0,
                "overall_safety_passed": safety_passed,
            },
            "recommendations": self._generate_recommendations(success_rate, compensation_rate),
            "evidence_artifacts": {
                "operation_log": f"operations_{self.simulation_id}.json",
                "safety_violations": f"violations_{self.simulation_id}.json",
                "compensation_events": f"compensation_{self.simulation_id}.json",
            },
        }

        print("\n✅ Simulation completed:")
        print(f"   Success rate: {success_rate:.2f}% (target: ≥{self.success_threshold}%)")
        print(
            f"   Compensation rate: {compensation_rate:.2f}% (target: ≤{self.compensation_threshold}%)"
        )
        print(
            f"   Residency violations: {len([v for v in self.safety_violations if v['violation_type'] == 'residency'])}"
        )
        print(f"   Safety assessment: {'✅ PASSED' if safety_passed else '❌ FAILED'}")

        return simulation_results

    def _select_operation_type(self, operation_mix: dict[str, float]) -> str:
        """Select operation type based on probability mix"""
        rand = random.random()
        cumulative = 0.0

        for operation_type, probability in operation_mix.items():
            cumulative += probability
            if rand <= cumulative:
                return operation_type

        return "data_query"  # Default fallback

    def _generate_operation_context(self, operation_type: str) -> dict[str, Any]:
        """Generate realistic context for operation type"""

        base_context = {
            "tenant": self.tenant,
            "data_region": "us-east-1",
            "processing_region": "us-east-1",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        # Add operation-specific context
        if operation_type == "computed_write":
            base_context.update(
                {
                    "complexity": random.choice(["low", "medium", "high"]),
                    "data_size": random.choice(["small", "medium", "large"]),
                    "write_type": random.choice(["update", "insert", "upsert"]),
                }
            )
        elif operation_type == "data_aggregation":
            base_context.update(
                {
                    "aggregation_type": random.choice(["sum", "avg", "count", "group_by"]),
                    "data_points": random.randint(100, 10000),
                    "complexity": "high" if random.random() < 0.1 else "medium",
                }
            )

        # Occasionally add high-risk factors
        if random.random() < 0.02:  # 2% chance
            base_context["contains_pii"] = True

        if random.random() < 0.01:  # 1% chance
            base_context["cross_tenant"] = True

        return base_context

    def _generate_recommendations(self, success_rate: float, compensation_rate: float) -> list[str]:
        """Generate recommendations based on simulation results"""

        recommendations = []

        if success_rate < self.success_threshold:
            recommendations.append(
                f"SUCCESS RATE: {success_rate:.2f}% below {self.success_threshold}% threshold - review operation reliability"
            )

        if compensation_rate > self.compensation_threshold:
            recommendations.append(
                f"COMPENSATION RATE: {compensation_rate:.2f}% above {self.compensation_threshold}% threshold - investigate failure patterns"
            )

        if len(self.safety_violations) > 0:
            recommendations.append(
                f"SAFETY VIOLATIONS: {len(self.safety_violations)} violations detected - strengthen policy enforcement"
            )

        if len([v for v in self.safety_violations if v["violation_type"] == "residency"]) > 0:
            recommendations.append(
                "RESIDENCY VIOLATIONS: Critical issue - halt enactment immediately"
            )

        if not recommendations:
            recommendations.append("All safety thresholds met - ready for production enactment")

        return recommendations

    def save_evidence_artifacts(self, output_dir: str) -> list[str]:
        """Save detailed evidence artifacts"""

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        artifacts = []

        # Save operation log
        operations_file = output_path / f"operations_{self.simulation_id}.json"
        with open(operations_file, "w") as f:
            json.dump(self.operation_log, f, indent=2)
        artifacts.append(str(operations_file))

        # Save safety violations
        violations_file = output_path / f"violations_{self.simulation_id}.json"
        with open(violations_file, "w") as f:
            json.dump(self.safety_violations, f, indent=2)
        artifacts.append(str(violations_file))

        # Save compensation events
        compensation_file = output_path / f"compensation_{self.simulation_id}.json"
        with open(compensation_file, "w") as f:
            json.dump(self.compensation_events, f, indent=2)
        artifacts.append(str(compensation_file))

        print(f"✅ Evidence artifacts saved to {output_path}")
        return artifacts


def main():
    parser = argparse.ArgumentParser(description="MC Platform Autonomy Tier-3 Simulator")
    parser.add_argument("--tenant", default="TENANT_003", help="Target tenant")
    parser.add_argument(
        "--operations", type=int, default=1000, help="Number of operations to simulate"
    )
    parser.add_argument(
        "--output",
        default="evidence/v0.3.3/autonomy/TENANT_003",
        help="Output directory for evidence",
    )
    parser.add_argument("--report", default="out/T3-sim-report.json", help="Simulation report path")

    args = parser.parse_args()

    # Initialize simulator
    simulator = AutonomyTier3Simulator(tenant=args.tenant)

    try:
        # Run simulation
        results = simulator.run_simulation(num_operations=args.operations)

        # Save evidence artifacts
        artifacts = simulator.save_evidence_artifacts(args.output)

        # Update results with artifact paths
        results["evidence_artifacts"] = {
            "artifacts_saved": artifacts,
            "output_directory": args.output,
        }

        # Save simulation report
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        with open(args.report, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n✅ Simulation report saved: {args.report}")

        # Exit with appropriate code
        safety_passed = results["safety_assessment"]["overall_safety_passed"]
        sys.exit(0 if safety_passed else 1)

    except Exception as e:
        print(f"❌ Simulation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
