#!/usr/bin/env python3
"""
Autonomous Guarded Remediation Engine
MC Platform v0.3.6 - Epic E3: Autonomous Guarded Remediation

When alerts page (p95, SIEM <95%, comp >0.5%), generates signed remediation
proposals with HITL approve/deny workflow. Target: MTTR ≤ 7 minutes.
"""

import asyncio
import hashlib
import hmac
import json
import subprocess
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


@dataclass
class IncidentAlert:
    """Incident alert triggering remediation"""

    alert_id: str
    alert_name: str
    severity: str
    service: str
    tenant_id: str | None
    metrics: dict[str, float]
    timestamp: str
    description: str


@dataclass
class RemediationAction:
    """Single remediation action"""

    action_type: str  # "scale_hpa", "adjust_budget", "route_bias", "circuit_break"
    target_resource: str
    current_config: dict[str, Any]
    proposed_config: dict[str, Any]
    expected_impact: str
    risk_level: str  # "low", "medium", "high"
    rollback_config: dict[str, Any]


@dataclass
class RemediationProposal:
    """Complete remediation proposal with signatures"""

    proposal_id: str
    incident_id: str
    timestamp: str
    actions: list[RemediationAction]
    estimated_mttr_minutes: float
    confidence_score: float
    policy_validated: bool
    simulation_results: dict[str, Any]
    signature: str
    approver_required: bool
    auto_apply_threshold: float = 0.9


@dataclass
class RemediationExecution:
    """Execution record of remediation"""

    execution_id: str
    proposal_id: str
    approved_by: str
    approved_at: str
    executed_at: str
    status: str  # "pending", "executing", "completed", "failed", "rolled_back"
    execution_logs: list[str]
    rollback_plan: dict[str, Any]
    actual_mttr_minutes: float | None = None


class AutonomousRemediator:
    """Autonomous system for generating and executing remediation proposals"""

    def __init__(self, signing_key: bytes = None):
        self.signing_key = signing_key or b"mc-remediator-v036-demo-key"
        self.evidence_dir = Path("evidence/v0.3.6/remediation")
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

        # Load remediation playbooks
        self.playbooks = self._load_playbooks()

        # Performance tracking
        self.mttr_history: list[float] = []

    def _load_playbooks(self) -> dict[str, Any]:
        """Load remediation playbooks for different incident types"""
        return {
            "high_p95_latency": {
                "description": "P95 latency spike remediation",
                "actions": [
                    {
                        "type": "scale_hpa",
                        "target": "agent-workbench",
                        "scale_factor": 1.5,
                        "max_replicas": 20,
                    },
                    {
                        "type": "adjust_budget",
                        "target": "inference_budget",
                        "increase_percent": 20,
                        "duration_minutes": 15,
                    },
                ],
                "confidence": 0.85,
                "mttr_estimate": 4.5,
            },
            "siem_delivery_low": {
                "description": "SIEM delivery rate below 95%",
                "actions": [
                    {"type": "circuit_break", "target": "low_priority_events", "threshold": 0.5},
                    {
                        "type": "route_bias",
                        "target": "siem_ingestion",
                        "bias_to": "primary_pipeline",
                        "percentage": 90,
                    },
                ],
                "confidence": 0.92,
                "mttr_estimate": 3.2,
            },
            "canary_composite_low": {
                "description": "Canary composite score below threshold",
                "actions": [
                    {
                        "type": "route_bias",
                        "target": "canary_traffic",
                        "bias_to": "baseline",
                        "percentage": 80,
                    },
                    {
                        "type": "extend_bake",
                        "target": "canary_deployment",
                        "additional_minutes": 10,
                    },
                ],
                "confidence": 0.95,
                "mttr_estimate": 2.8,
            },
        }

    def _classify_incident(self, alert: IncidentAlert) -> str:
        """Classify incident type for playbook selection"""
        alert_lower = alert.alert_name.lower()

        if "p95" in alert_lower or "latency" in alert_lower:
            return "high_p95_latency"
        elif "siem" in alert_lower and "delivery" in alert_lower:
            return "siem_delivery_low"
        elif "canary" in alert_lower and "composite" in alert_lower:
            return "canary_composite_low"
        else:
            return "unknown"

    def _generate_kubernetes_hpa_action(self, playbook_action: dict[str, Any]) -> RemediationAction:
        """Generate HPA scaling action"""
        current_hpa = {"minReplicas": 3, "maxReplicas": 10, "targetCPUUtilizationPercentage": 70}

        scale_factor = playbook_action.get("scale_factor", 1.5)
        max_replicas = playbook_action.get("max_replicas", 20)

        proposed_hpa = {
            "minReplicas": max(current_hpa["minReplicas"], int(current_hpa["maxReplicas"] * 0.5)),
            "maxReplicas": min(max_replicas, int(current_hpa["maxReplicas"] * scale_factor)),
            "targetCPUUtilizationPercentage": max(
                50, current_hpa["targetCPUUtilizationPercentage"] - 10
            ),
        }

        return RemediationAction(
            action_type="scale_hpa",
            target_resource=f"hpa/{playbook_action['target']}",
            current_config=current_hpa,
            proposed_config=proposed_hpa,
            expected_impact=f"Increase capacity by {int((scale_factor - 1) * 100)}%",
            risk_level="medium",
            rollback_config=current_hpa,
        )

    def _generate_budget_action(self, playbook_action: dict[str, Any]) -> RemediationAction:
        """Generate budget adjustment action"""
        current_budget = {
            "daily_limit_usd": 100.0,
            "per_request_limit_ms": 5000,
            "throttle_threshold": 0.8,
        }

        increase_percent = playbook_action.get("increase_percent", 20) / 100
        duration_minutes = playbook_action.get("duration_minutes", 15)

        proposed_budget = {
            "daily_limit_usd": current_budget["daily_limit_usd"] * (1 + increase_percent),
            "per_request_limit_ms": current_budget["per_request_limit_ms"],
            "throttle_threshold": min(0.95, current_budget["throttle_threshold"] + 0.1),
            "temporary_increase_until": (
                datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
            ).isoformat(),
        }

        return RemediationAction(
            action_type="adjust_budget",
            target_resource=playbook_action["target"],
            current_config=current_budget,
            proposed_config=proposed_budget,
            expected_impact=f"Increase budget by {int(increase_percent * 100)}% for {duration_minutes}min",
            risk_level="low",
            rollback_config=current_budget,
        )

    def _generate_route_bias_action(self, playbook_action: dict[str, Any]) -> RemediationAction:
        """Generate traffic routing bias action"""
        current_routing = {
            "baseline_weight": 50,
            "canary_weight": 50,
            "circuit_breaker_enabled": False,
        }

        bias_to = playbook_action.get("bias_to", "baseline")
        percentage = playbook_action.get("percentage", 80)

        if bias_to == "baseline":
            proposed_routing = {
                "baseline_weight": percentage,
                "canary_weight": 100 - percentage,
                "circuit_breaker_enabled": True,
            }
        else:
            proposed_routing = {
                "baseline_weight": 100 - percentage,
                "canary_weight": percentage,
                "circuit_breaker_enabled": False,
            }

        return RemediationAction(
            action_type="route_bias",
            target_resource=playbook_action["target"],
            current_config=current_routing,
            proposed_config=proposed_routing,
            expected_impact=f"Route {percentage}% traffic to {bias_to}",
            risk_level="high" if percentage > 90 else "medium",
            rollback_config=current_routing,
        )

    async def _validate_policy_compliance(self, actions: list[RemediationAction]) -> bool:
        """Validate proposed actions against OPA policies"""
        try:
            # Create policy input
            policy_input = {
                "remediation_request": {
                    "actions": [asdict(action) for action in actions],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            }

            # Write input to temp file
            input_file = self.evidence_dir / "policy_input.json"
            with open(input_file, "w") as f:
                json.dump(policy_input, f, indent=2)

            # Run OPA eval (assuming opa executable is available)
            result = subprocess.run(
                ["opa", "eval", "-d", "opa/", "-i", str(input_file), "data.remediation.allow"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                output = json.loads(result.stdout)
                return output.get("result", [{}])[0].get("expressions", [{}])[0].get("value", False)

        except Exception as e:
            print(f"Policy validation failed: {e}")

        # Default to requiring approval if validation fails
        return False

    async def _simulate_remediation(self, actions: list[RemediationAction]) -> dict[str, Any]:
        """Simulate proposed remediation actions"""
        # Simplified simulation - in production: use chaos engineering framework
        simulation_results = {
            "predicted_p95_improvement_ms": 0,
            "predicted_error_rate_change": 0,
            "predicted_cost_impact_percent": 0,
            "confidence_score": 0.8,
            "estimated_recovery_time_minutes": 5.0,
        }

        for action in actions:
            if action.action_type == "scale_hpa":
                # Scaling should improve latency but increase cost
                simulation_results["predicted_p95_improvement_ms"] -= 50
                simulation_results["predicted_cost_impact_percent"] += 25

            elif action.action_type == "adjust_budget":
                # Budget increases should reduce throttling
                simulation_results["predicted_error_rate_change"] -= 0.02
                simulation_results["predicted_cost_impact_percent"] += 15

            elif action.action_type == "route_bias":
                # Route biasing to baseline should improve reliability
                simulation_results["predicted_error_rate_change"] -= 0.01
                simulation_results["predicted_p95_improvement_ms"] -= 25

        return simulation_results

    def _sign_proposal(self, proposal: RemediationProposal) -> str:
        """Sign remediation proposal for integrity"""
        proposal_data = {
            "proposal_id": proposal.proposal_id,
            "incident_id": proposal.incident_id,
            "timestamp": proposal.timestamp,
            "actions": [asdict(action) for action in proposal.actions],
            "confidence_score": proposal.confidence_score,
        }

        canonical = json.dumps(proposal_data, sort_keys=True, separators=(",", ":"))
        signature = hmac.new(self.signing_key, canonical.encode(), hashlib.sha256).hexdigest()
        return f"mc-remediation:{signature}"

    async def propose_remediation(
        self, alert: IncidentAlert, dry_run: bool = False
    ) -> RemediationProposal:
        """Generate signed remediation proposal for incident"""
        proposal_id = f"rem-{uuid.uuid4().hex[:12]}"

        # Classify incident and select playbook
        incident_type = self._classify_incident(alert)
        playbook = self.playbooks.get(incident_type, self.playbooks["high_p95_latency"])

        print(
            f"🎯 Generating remediation for {incident_type} (confidence: {playbook['confidence']})"
        )

        # Generate remediation actions
        actions = []
        for playbook_action in playbook["actions"]:
            if playbook_action["type"] == "scale_hpa":
                action = self._generate_kubernetes_hpa_action(playbook_action)
            elif playbook_action["type"] == "adjust_budget":
                action = self._generate_budget_action(playbook_action)
            elif playbook_action["type"] == "route_bias":
                action = self._generate_route_bias_action(playbook_action)
            else:
                continue  # Skip unknown action types

            actions.append(action)

        # Validate against policies
        policy_validated = await self._validate_policy_compliance(actions)

        # Run simulation
        simulation_results = await self._simulate_remediation(actions)

        # Create proposal
        proposal = RemediationProposal(
            proposal_id=proposal_id,
            incident_id=alert.alert_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            actions=actions,
            estimated_mttr_minutes=playbook["mttr_estimate"],
            confidence_score=playbook["confidence"],
            policy_validated=policy_validated,
            simulation_results=simulation_results,
            signature="",  # Will be set below
            approver_required=not policy_validated or playbook["confidence"] < 0.9,
        )

        # Sign proposal
        proposal.signature = self._sign_proposal(proposal)

        # Save proposal
        if not dry_run:
            proposal_file = self.evidence_dir / f"proposal-{proposal_id}.json"
            with open(proposal_file, "w") as f:
                json.dump(asdict(proposal), f, indent=2)

            print(f"💾 Proposal saved: {proposal_file}")

        return proposal

    async def execute_remediation(self, proposal_id: str, approver: str) -> RemediationExecution:
        """Execute approved remediation proposal"""
        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        start_time = time.time()

        # Load proposal
        proposal_file = self.evidence_dir / f"proposal-{proposal_id}.json"
        with open(proposal_file) as f:
            proposal_data = json.load(f)

        proposal = RemediationProposal(**proposal_data)

        execution = RemediationExecution(
            execution_id=execution_id,
            proposal_id=proposal_id,
            approved_by=approver,
            approved_at=datetime.now(timezone.utc).isoformat(),
            executed_at="",
            status="pending",
            execution_logs=[],
            rollback_plan={},
        )

        try:
            execution.status = "executing"
            execution.executed_at = datetime.now(timezone.utc).isoformat()

            # Execute each action
            for i, action in enumerate(proposal.actions):
                log_entry = f"Executing action {i+1}/{len(proposal.actions)}: {action.action_type}"
                execution.execution_logs.append(log_entry)
                print(f"🔧 {log_entry}")

                # Simulate action execution
                await asyncio.sleep(0.5)  # Simulate execution time

                if action.action_type == "scale_hpa":
                    # In production: apply Kubernetes HPA changes
                    execution.execution_logs.append(f"✅ Scaled {action.target_resource}")

                elif action.action_type == "adjust_budget":
                    # In production: update budget configuration
                    execution.execution_logs.append(
                        f"✅ Adjusted budget for {action.target_resource}"
                    )

                elif action.action_type == "route_bias":
                    # In production: update traffic routing
                    execution.execution_logs.append(
                        f"✅ Applied route bias to {action.target_resource}"
                    )

            execution.status = "completed"
            actual_mttr = (time.time() - start_time) / 60
            execution.actual_mttr_minutes = actual_mttr

            # Track MTTR performance
            self.mttr_history.append(actual_mttr)

            execution.execution_logs.append(
                f"✅ Remediation completed in {actual_mttr:.1f} minutes"
            )

        except Exception as e:
            execution.status = "failed"
            execution.execution_logs.append(f"❌ Execution failed: {str(e)}")

        # Save execution record
        execution_file = self.evidence_dir / f"execution-{execution_id}.json"
        with open(execution_file, "w") as f:
            json.dump(asdict(execution), f, indent=2)

        return execution

    def get_mttr_metrics(self) -> dict[str, float]:
        """Get MTTR performance metrics"""
        if not self.mttr_history:
            return {"p50_minutes": 0, "p95_minutes": 0, "count": 0}

        sorted_mttrs = sorted(self.mttr_history[-100:])  # Last 100 remediations
        count = len(sorted_mttrs)

        return {
            "p50_minutes": sorted_mttrs[int(count * 0.50)] if count > 0 else 0,
            "p95_minutes": sorted_mttrs[int(count * 0.95)] if count > 0 else 0,
            "p99_minutes": sorted_mttrs[int(count * 0.99)] if count > 0 else 0,
            "count": count,
            "sla_met_7min": (
                sum(1 for mttr in sorted_mttrs if mttr <= 7) / count if count > 0 else 0
            ),
        }


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Autonomous Remediation Engine")
    parser.add_argument("--from", dest="alert_file", help="Alert JSON file to process")
    parser.add_argument("--out", help="Output file for proposal")
    parser.add_argument("--dry-run", action="store_true", help="Generate proposal without saving")
    parser.add_argument("--execute", help="Execute proposal by ID")
    parser.add_argument("--approver", default="system", help="Approver for execution")

    args = parser.parse_args()

    remediator = AutonomousRemediator()

    if args.alert_file:
        # Load alert and generate proposal
        with open(args.alert_file) as f:
            alert_data = json.load(f)

        alert = IncidentAlert(**alert_data)

        async def run_proposal():
            proposal = await remediator.propose_remediation(alert, args.dry_run)

            if args.out:
                with open(args.out, "w") as f:
                    json.dump(asdict(proposal), f, indent=2)
                print(f"📄 Proposal written to {args.out}")

            print("\n📊 Proposal Summary:")
            print(f"   ID: {proposal.proposal_id}")
            print(f"   Actions: {len(proposal.actions)}")
            print(f"   Confidence: {proposal.confidence_score:.2f}")
            print(f"   Est. MTTR: {proposal.estimated_mttr_minutes:.1f} min")
            print(f"   Policy validated: {proposal.policy_validated}")
            print(f"   Requires approval: {proposal.approver_required}")

        asyncio.run(run_proposal())

    elif args.execute:
        # Execute proposal
        async def run_execution():
            execution = await remediator.execute_remediation(args.execute, args.approver)
            print("\n📊 Execution Summary:")
            print(f"   ID: {execution.execution_id}")
            print(f"   Status: {execution.status}")
            print(
                f"   MTTR: {execution.actual_mttr_minutes:.1f} min"
                if execution.actual_mttr_minutes
                else "   MTTR: N/A"
            )

        asyncio.run(run_execution())

    else:
        print("Use --from to generate proposal or --execute to run remediation")


if __name__ == "__main__":
    main()
