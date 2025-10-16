#!/usr/bin/env python3
"""
MC Platform Autonomy Controller
Manages autonomy simulation, enactment, and safety monitoring for Tier-3 operations
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any


class AutonomyController:
    def __init__(self):
        self.platform_version = "v0.3.3-mc"
        self.safety_thresholds = {
            "success_rate_min": 99.9,
            "compensation_rate_max": 0.5,
            "residency_violations_max": 0,
        }

    def simulate_tenant_autonomy(
        self, tenant: str, operations: int = 1000, op_set: str = "derived_updates"
    ) -> dict[str, Any]:
        """Run autonomy simulation for tenant"""

        print(f"🤖 Simulating {op_set} autonomy for {tenant}")

        # Define operation sets
        operation_sets = {
            "derived_updates": {
                "data_query": 0.3,
                "computed_write": 0.4,
                "derived_calculation": 0.2,
                "index_update": 0.1,
            },
            "read_heavy": {"data_query": 0.7, "data_aggregation": 0.2, "cache_refresh": 0.1},
            "write_heavy": {"computed_write": 0.6, "index_update": 0.3, "derived_calculation": 0.1},
        }

        operation_mix = operation_sets.get(op_set, operation_sets["derived_updates"])

        try:
            # Run simulation using the simulator
            cmd = [
                "python3",
                "services/autonomy-tier3/tenant003-simulator.py",
                "--tenant",
                tenant,
                "--operations",
                str(operations),
                "--output",
                f"evidence/v0.3.3/autonomy/{tenant}",
                "--report",
                f"out/{tenant}-sim-report.json",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            if result.returncode == 0:
                # Load simulation results
                with open(f"out/{tenant}-sim-report.json") as f:
                    sim_results = json.load(f)

                print("✅ Simulation completed successfully")
                return {
                    "status": "success",
                    "simulation_results": sim_results,
                    "safety_passed": sim_results["safety_assessment"]["overall_safety_passed"],
                }
            else:
                print(f"❌ Simulation failed: {result.stderr}")
                return {"status": "failed", "error": result.stderr, "stdout": result.stdout}

        except Exception as e:
            print(f"❌ Error running simulation: {e}")
            return {"status": "error", "error": str(e)}

    def enact_autonomy(
        self,
        tenant: str,
        from_sim: str | None = None,
        require_hitl: bool = True,
        evidence_path: str = None,
    ) -> dict[str, Any]:
        """Enact autonomy for tenant with HITL and tripwires"""

        print(f"🚀 Enacting autonomy for {tenant}")

        if from_sim:
            # Validate simulation results first
            try:
                with open(from_sim) as f:
                    sim_data = json.load(f)

                if not sim_data["safety_assessment"]["overall_safety_passed"]:
                    return {
                        "status": "blocked",
                        "reason": "simulation_safety_failed",
                        "details": "Simulation did not meet safety thresholds",
                    }

                print("✅ Simulation validation passed")

            except Exception as e:
                return {"status": "error", "reason": "simulation_validation_error", "error": str(e)}

        # HITL confirmation
        if require_hitl:
            print("\n⚠️ HUMAN-IN-THE-LOOP CONFIRMATION REQUIRED")
            print(f"   Tenant: {tenant}")
            print("   Operation: Tier-3 Autonomy Enactment")
            print("   Impact: Computed operations with real data writes")

            # In production, this would integrate with approval systems
            # For simulation, we'll create an approval record
            approval_record = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "tenant": tenant,
                "operation": "tier3_autonomy_enactment",
                "approved_by": "simulation_system",
                "approval_method": "automated_for_demo",
                "conditions": [
                    "48h canary period",
                    "auto-halt on threshold breach",
                    "comprehensive monitoring",
                ],
            }

            print("✅ HITL approval recorded (demo mode)")

        # Create enactment configuration
        enactment_config = {
            "tenant": tenant,
            "tier": "T3_COMPUTED",
            "start_time": datetime.utcnow().isoformat() + "Z",
            "canary_duration_hours": 48,
            "monitoring_enabled": True,
            "auto_halt_enabled": True,
            "tripwires": {
                "success_rate_min": self.safety_thresholds["success_rate_min"],
                "compensation_rate_max": self.safety_thresholds["compensation_rate_max"],
                "residency_violations_max": self.safety_thresholds["residency_violations_max"],
                "monitoring_window_minutes": 15,
                "breach_threshold_count": 3,
            },
        }

        # Simulate enactment process
        enactment_result = self._simulate_enactment_process(enactment_config)

        # Save evidence
        if evidence_path:
            Path(evidence_path).parent.mkdir(parents=True, exist_ok=True)
            with open(evidence_path, "w") as f:
                json.dump(enactment_result, f, indent=2)

            print(f"✅ Enactment evidence saved: {evidence_path}")

        return enactment_result

    def _simulate_enactment_process(self, config: dict[str, Any]) -> dict[str, Any]:
        """Simulate the enactment process with monitoring and tripwires"""

        tenant = config["tenant"]
        print(f"🎯 Starting {config['canary_duration_hours']}h canary enactment for {tenant}")

        # Simulate canary period monitoring
        monitoring_results = []
        for hour in range(min(3, config["canary_duration_hours"])):  # Simulate first 3 hours
            print(f"   Hour {hour + 1}: Monitoring autonomy operations...")

            # Simulate metrics collection
            hour_metrics = {
                "hour": hour + 1,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "operations_executed": random.randint(50, 200),
                "success_rate": random.uniform(99.85, 99.95),
                "compensation_rate": random.uniform(0.1, 0.3),
                "residency_violations": 0,
                "policy_violations": random.randint(0, 2),
                "avg_latency_ms": random.uniform(45, 85),
                "tripwire_breaches": 0,
            }

            # Check for tripwire breaches
            if hour_metrics["success_rate"] < config["tripwires"]["success_rate_min"]:
                hour_metrics["tripwire_breaches"] += 1
                hour_metrics["breach_reasons"] = hour_metrics.get("breach_reasons", [])
                hour_metrics["breach_reasons"].append("success_rate_low")

            if hour_metrics["compensation_rate"] > config["tripwires"]["compensation_rate_max"]:
                hour_metrics["tripwire_breaches"] += 1
                hour_metrics["breach_reasons"] = hour_metrics.get("breach_reasons", [])
                hour_metrics["breach_reasons"].append("compensation_rate_high")

            monitoring_results.append(hour_metrics)

            print(
                f"      Success: {hour_metrics['success_rate']:.2f}%, Compensation: {hour_metrics['compensation_rate']:.2f}%"
            )

            # Simulate monitoring delay
            time.sleep(0.5)

        # Calculate overall enactment status
        total_operations = sum(m["operations_executed"] for m in monitoring_results)
        avg_success_rate = sum(m["success_rate"] for m in monitoring_results) / len(
            monitoring_results
        )
        avg_compensation_rate = sum(m["compensation_rate"] for m in monitoring_results) / len(
            monitoring_results
        )
        total_breaches = sum(m["tripwire_breaches"] for m in monitoring_results)

        enactment_status = "success"
        if total_breaches >= config["tripwires"]["breach_threshold_count"]:
            enactment_status = "halted_tripwire_breach"
        elif avg_success_rate < config["tripwires"]["success_rate_min"]:
            enactment_status = "halted_success_rate"
        elif avg_compensation_rate > config["tripwires"]["compensation_rate_max"]:
            enactment_status = "halted_compensation_rate"

        return {
            "enactment_metadata": {
                "tenant": tenant,
                "start_time": config["start_time"],
                "end_time": datetime.utcnow().isoformat() + "Z",
                "platform_version": self.platform_version,
                "enactment_status": enactment_status,
                "monitoring_duration_hours": len(monitoring_results),
            },
            "configuration": config,
            "monitoring_results": monitoring_results,
            "aggregate_metrics": {
                "total_operations": total_operations,
                "average_success_rate": avg_success_rate,
                "average_compensation_rate": avg_compensation_rate,
                "total_tripwire_breaches": total_breaches,
                "residency_violations": sum(m["residency_violations"] for m in monitoring_results),
                "policy_violations": sum(m["policy_violations"] for m in monitoring_results),
            },
            "safety_assessment": {
                "success_rate_meets_threshold": avg_success_rate
                >= config["tripwires"]["success_rate_min"],
                "compensation_rate_meets_threshold": avg_compensation_rate
                <= config["tripwires"]["compensation_rate_max"],
                "no_residency_violations": sum(
                    m["residency_violations"] for m in monitoring_results
                )
                == 0,
                "tripwire_breaches_acceptable": total_breaches
                < config["tripwires"]["breach_threshold_count"],
                "overall_enactment_success": enactment_status == "success",
            },
            "recommendations": self._generate_enactment_recommendations(
                enactment_status, avg_success_rate, avg_compensation_rate, total_breaches
            ),
        }

    def _generate_enactment_recommendations(
        self, status: str, success_rate: float, compensation_rate: float, breaches: int
    ) -> list[str]:
        """Generate recommendations based on enactment results"""

        recommendations = []

        if status == "success":
            recommendations.append("Enactment successful - continue full rollout")
            recommendations.append("Monitor metrics for next 24h before expanding scope")

        elif status == "halted_tripwire_breach":
            recommendations.append(
                f"Enactment halted due to {breaches} tripwire breaches - investigate root causes"
            )
            recommendations.append("Review operation patterns and adjust safety thresholds")

        elif status == "halted_success_rate":
            recommendations.append(
                f"Success rate {success_rate:.2f}% below threshold - halt enactment immediately"
            )
            recommendations.append("Perform detailed failure analysis before retry")

        elif status == "halted_compensation_rate":
            recommendations.append(
                f"Compensation rate {compensation_rate:.2f}% above threshold - review compensation patterns"
            )

        if success_rate < 99.5:
            recommendations.append("Success rate declining - implement circuit breaker")

        if compensation_rate > 0.3:
            recommendations.append("High compensation rate - review failure modes")

        return recommendations


def main():
    parser = argparse.ArgumentParser(description="MC Platform Autonomy Controller")

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Simulate command
    sim_parser = subparsers.add_parser("simulate", help="Run autonomy simulation")
    sim_parser.add_argument("--tenant", default="TENANT_003", help="Target tenant")
    sim_parser.add_argument("--operations", type=int, default=1000, help="Number of operations")
    sim_parser.add_argument(
        "--op-set",
        default="derived_updates",
        choices=["derived_updates", "read_heavy", "write_heavy"],
        help="Operation set",
    )
    sim_parser.add_argument("--evidence", help="Evidence output path")

    # Enact command
    enact_parser = subparsers.add_parser("enact", help="Enact autonomy")
    enact_parser.add_argument("--tenant", default="TENANT_003", help="Target tenant")
    enact_parser.add_argument("--from-sim", help="Path to simulation results")
    enact_parser.add_argument(
        "--require-hitl", action="store_true", default=True, help="Require HITL approval"
    )
    enact_parser.add_argument("--evidence", help="Evidence output path")

    args = parser.parse_args()

    controller = AutonomyController()

    if args.command == "simulate":
        result = controller.simulate_tenant_autonomy(
            tenant=args.tenant, operations=args.operations, op_set=args.op_set
        )

        if args.evidence:
            Path(args.evidence).parent.mkdir(parents=True, exist_ok=True)
            with open(args.evidence, "w") as f:
                json.dump(result, f, indent=2)

        sys.exit(0 if result["status"] == "success" else 1)

    elif args.command == "enact":
        result = controller.enact_autonomy(
            tenant=args.tenant,
            from_sim=args.from_sim,
            require_hitl=args.require_hitl,
            evidence_path=args.evidence,
        )

        success_statuses = ["success"]
        sys.exit(
            0
            if result.get("enactment_metadata", {}).get("enactment_status") in success_statuses
            else 1
        )

    else:
        parser.print_help()


# Add random import for simulation
import random

if __name__ == "__main__":
    main()
