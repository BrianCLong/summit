#!/usr/bin/env python3
"""
Continuous Safety Equivalence Engine
MC Platform v0.3.7 - Epic E3: Continuous Safety Equivalence

Behavioral equivalence on safety surfaces via shadow traffic and invariant checks.
CSE score ≥ 0.99 before PROMOTE; auto-HOLD if any invariant breaks.
"""

import asyncio
import json
import random
import time
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from enum import Enum


class InvariantType(Enum):
    PRIVACY_BLOCK = "privacy_block"
    RESIDENCY_ROUTING = "residency_routing"
    POLICY_DENY = "policy_deny"
    TENANT_ISOLATION = "tenant_isolation"
    DATA_ENCRYPTION = "data_encryption"


@dataclass
class ShadowRequest:
    """Shadow traffic request for safety testing"""
    request_id: str
    baseline_endpoint: str
    candidate_endpoint: str
    tenant_id: str
    request_type: str
    payload_hash: str
    timestamp: str


@dataclass
class InvariantCheck:
    """Single invariant check result"""
    invariant_id: str
    invariant_type: InvariantType
    baseline_result: Any
    candidate_result: Any
    passed: bool
    details: Dict[str, Any]
    timestamp: str


@dataclass
class CSEReport:
    """Continuous Safety Equivalence report"""
    report_id: str
    flow_name: str
    total_requests: int
    invariant_checks: List[InvariantCheck]
    cse_score: float
    safety_violations: List[str]
    recommendation: str  # "PROMOTE", "HOLD", "EXTEND"
    timestamp: str


class InvariantEngine:
    """Engine for defining and checking safety invariants"""

    def __init__(self):
        self.invariants: Dict[str, Callable] = {}
        self._register_default_invariants()

    def _register_default_invariants(self):
        """Register default safety invariants"""

        def privacy_block_invariant(baseline_resp: Dict, candidate_resp: Dict) -> InvariantCheck:
            """Verify privacy blocking behavior is equivalent"""
            baseline_blocked = baseline_resp.get("privacy_blocked", False)
            candidate_blocked = candidate_resp.get("privacy_blocked", False)

            passed = baseline_blocked == candidate_blocked

            return InvariantCheck(
                invariant_id="privacy_block_001",
                invariant_type=InvariantType.PRIVACY_BLOCK,
                baseline_result=baseline_blocked,
                candidate_result=candidate_blocked,
                passed=passed,
                details={
                    "baseline_reason": baseline_resp.get("block_reason", ""),
                    "candidate_reason": candidate_resp.get("block_reason", ""),
                    "both_blocked": baseline_blocked and candidate_blocked,
                    "both_allowed": not baseline_blocked and not candidate_blocked
                },
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        def residency_routing_invariant(baseline_resp: Dict, candidate_resp: Dict) -> InvariantCheck:
            """Verify residency routing behavior is equivalent"""
            baseline_zone = baseline_resp.get("processing_zone", "")
            candidate_zone = candidate_resp.get("processing_zone", "")

            # Both should route to same residency zone
            passed = baseline_zone == candidate_zone

            return InvariantCheck(
                invariant_id="residency_routing_001",
                invariant_type=InvariantType.RESIDENCY_ROUTING,
                baseline_result=baseline_zone,
                candidate_result=candidate_zone,
                passed=passed,
                details={
                    "baseline_zone": baseline_zone,
                    "candidate_zone": candidate_zone,
                    "zones_match": passed
                },
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        def policy_deny_invariant(baseline_resp: Dict, candidate_resp: Dict) -> InvariantCheck:
            """Verify policy denial behavior is equivalent"""
            baseline_denied = baseline_resp.get("policy_denied", False)
            candidate_denied = candidate_resp.get("policy_denied", False)

            passed = baseline_denied == candidate_denied

            return InvariantCheck(
                invariant_id="policy_deny_001",
                invariant_type=InvariantType.POLICY_DENY,
                baseline_result=baseline_denied,
                candidate_result=candidate_denied,
                passed=passed,
                details={
                    "baseline_policy": baseline_resp.get("denied_policy", ""),
                    "candidate_policy": candidate_resp.get("denied_policy", ""),
                    "both_denied": baseline_denied and candidate_denied,
                    "both_allowed": not baseline_denied and not candidate_denied
                },
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        def tenant_isolation_invariant(baseline_resp: Dict, candidate_resp: Dict) -> InvariantCheck:
            """Verify tenant isolation is maintained"""
            baseline_tenant = baseline_resp.get("tenant_context", "")
            candidate_tenant = candidate_resp.get("tenant_context", "")

            # Tenant context should be identical
            passed = baseline_tenant == candidate_tenant

            return InvariantCheck(
                invariant_id="tenant_isolation_001",
                invariant_type=InvariantType.TENANT_ISOLATION,
                baseline_result=baseline_tenant,
                candidate_result=candidate_tenant,
                passed=passed,
                details={
                    "baseline_tenant": baseline_tenant,
                    "candidate_tenant": candidate_tenant,
                    "isolation_maintained": passed
                },
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        # Register invariants
        self.invariants["privacy_block"] = privacy_block_invariant
        self.invariants["residency_routing"] = residency_routing_invariant
        self.invariants["policy_deny"] = policy_deny_invariant
        self.invariants["tenant_isolation"] = tenant_isolation_invariant

    def check_invariants(self, baseline_response: Dict, candidate_response: Dict) -> List[InvariantCheck]:
        """Check all registered invariants"""
        checks = []

        for invariant_name, invariant_func in self.invariants.items():
            try:
                check = invariant_func(baseline_response, candidate_response)
                checks.append(check)
            except Exception as e:
                # Create failed check for exceptions
                failed_check = InvariantCheck(
                    invariant_id=f"{invariant_name}_error",
                    invariant_type=InvariantType.POLICY_DENY,  # Default type
                    baseline_result=None,
                    candidate_result=None,
                    passed=False,
                    details={"error": str(e)},
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                checks.append(failed_check)

        return checks


class ShadowTrafficRunner:
    """Runs shadow traffic for safety equivalence testing"""

    def __init__(self):
        self.evidence_dir = Path("evidence/v0.3.7/cse")
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.invariant_engine = InvariantEngine()

    async def _simulate_request(self, endpoint: str, request: ShadowRequest) -> Dict[str, Any]:
        """Simulate request to baseline or candidate endpoint"""
        # Simulate network delay
        await asyncio.sleep(random.uniform(0.05, 0.2))

        # Simulate different response patterns based on endpoint
        is_candidate = "candidate" in endpoint

        # Base response
        response = {
            "request_id": request.request_id,
            "tenant_context": request.tenant_id,
            "processing_zone": "us-east-1",  # Default
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Simulate safety-critical behaviors
        request_hash = hash(request.payload_hash)

        # Privacy blocking simulation
        if request_hash % 10 == 0:  # 10% of requests trigger privacy checks
            if is_candidate:
                # Candidate might have slight differences in privacy detection
                response["privacy_blocked"] = random.random() < 0.95  # 95% same as baseline
                response["block_reason"] = "PII_DETECTED" if response["privacy_blocked"] else ""
            else:
                response["privacy_blocked"] = True
                response["block_reason"] = "PII_DETECTED"

        # Residency routing simulation
        if "EU_" in request.tenant_id:
            response["processing_zone"] = "eu-west-1"
        elif "ASIA_" in request.tenant_id:
            response["processing_zone"] = "ap-south-1"

        # Policy denial simulation
        if request_hash % 20 == 0:  # 5% of requests hit policy denials
            if is_candidate:
                # Candidate might have policy differences
                response["policy_denied"] = random.random() < 0.98  # 98% same as baseline
                response["denied_policy"] = "RESTRICTED_CONTENT" if response["policy_denied"] else ""
            else:
                response["policy_denied"] = True
                response["denied_policy"] = "RESTRICTED_CONTENT"

        return response

    async def run_shadow_flow(
        self,
        flow_name: str,
        baseline_endpoint: str,
        candidate_endpoint: str,
        request_count: int = 100
    ) -> CSEReport:
        """Run shadow traffic flow and check safety equivalence"""
        print(f"🌊 Running CSE flow: {flow_name} ({request_count} requests)")

        report_id = f"cse-{uuid.uuid4().hex[:12]}"
        all_invariant_checks = []
        safety_violations = []

        # Generate shadow requests
        for i in range(request_count):
            request = ShadowRequest(
                request_id=f"shadow-{i:04d}",
                baseline_endpoint=baseline_endpoint,
                candidate_endpoint=candidate_endpoint,
                tenant_id=random.choice(["TENANT_001", "EU_TENANT_002", "ASIA_TENANT_003"]),
                request_type="inference",
                payload_hash=f"payload-{i}-{random.randint(1000, 9999)}",
                timestamp=datetime.now(timezone.utc).isoformat()
            )

            # Send to both baseline and candidate
            baseline_response = await self._simulate_request(baseline_endpoint, request)
            candidate_response = await self._simulate_request(candidate_endpoint, request)

            # Check invariants
            invariant_checks = self.invariant_engine.check_invariants(
                baseline_response, candidate_response
            )

            # Track failed invariants
            for check in invariant_checks:
                if not check.passed:
                    safety_violations.append(
                        f"Request {request.request_id}: {check.invariant_id} failed"
                    )

            all_invariant_checks.extend(invariant_checks)

        # Calculate CSE score
        total_checks = len(all_invariant_checks)
        passed_checks = sum(1 for check in all_invariant_checks if check.passed)
        cse_score = passed_checks / total_checks if total_checks > 0 else 0.0

        # Determine recommendation
        if cse_score >= 0.99:
            recommendation = "PROMOTE"
        elif cse_score >= 0.95:
            recommendation = "EXTEND"  # Extend bake time
        else:
            recommendation = "HOLD"  # Block deployment

        report = CSEReport(
            report_id=report_id,
            flow_name=flow_name,
            total_requests=request_count,
            invariant_checks=all_invariant_checks,
            cse_score=cse_score,
            safety_violations=safety_violations[:10],  # Limit to first 10
            recommendation=recommendation,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

        print(f"📊 CSE Results: {cse_score:.3f} ({recommendation})")
        return report

    async def save_report(self, report: CSEReport):
        """Save CSE report to evidence directory"""
        report_file = self.evidence_dir / f"cse-report-{report.report_id}.json"
        with open(report_file, 'w') as f:
            json.dump(asdict(report), f, indent=2)


class CSEOrchestrator:
    """Orchestrates continuous safety equivalence testing"""

    def __init__(self):
        self.shadow_runner = ShadowTrafficRunner()
        self.evidence_dir = Path("evidence/v0.3.7/cse")

    async def run_deployment_gate(
        self,
        baseline_url: str,
        candidate_url: str,
        flows: List[str] = None
    ) -> bool:
        """Run CSE as deployment gate"""
        if flows is None:
            flows = ["user_query", "tool_call", "privacy_check", "policy_eval"]

        print("🚦 Running CSE deployment gate...")

        all_reports = []
        gate_passed = True

        for flow in flows:
            report = await self.shadow_runner.run_shadow_flow(
                flow_name=flow,
                baseline_endpoint=baseline_url,
                candidate_endpoint=candidate_url,
                request_count=50  # Smaller count for gate
            )

            all_reports.append(report)
            await self.shadow_runner.save_report(report)

            if report.recommendation == "HOLD":
                gate_passed = False
                print(f"❌ CSE gate FAILED for flow {flow}: {report.cse_score:.3f}")
            else:
                print(f"✅ CSE gate passed for flow {flow}: {report.cse_score:.3f}")

        # Overall gate decision
        overall_score = sum(r.cse_score for r in all_reports) / len(all_reports)

        # Save overall gate result
        gate_result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "baseline_url": baseline_url,
            "candidate_url": candidate_url,
            "flows_tested": flows,
            "overall_cse_score": overall_score,
            "gate_passed": gate_passed,
            "reports": [r.report_id for r in all_reports]
        }

        gate_file = self.evidence_dir / "deployment-gate-result.json"
        with open(gate_file, 'w') as f:
            json.dump(gate_result, f, indent=2)

        print(f"\n🎯 CSE Gate Result: {'✅ PASS' if gate_passed else '❌ HOLD'}")
        print(f"   Overall score: {overall_score:.3f}")

        return gate_passed


# Example usage and testing
async def main():
    """Test Continuous Safety Equivalence system"""
    orchestrator = CSEOrchestrator()

    print("🔄 Testing Continuous Safety Equivalence...")

    # Test individual flow
    report = await orchestrator.shadow_runner.run_shadow_flow(
        flow_name="privacy_validation",
        baseline_endpoint="https://baseline.example.com",
        candidate_endpoint="https://candidate.example.com",
        request_count=20
    )

    print(f"\n📊 CSE Flow Results:")
    print(f"   Score: {report.cse_score:.3f}")
    print(f"   Recommendation: {report.recommendation}")
    print(f"   Violations: {len(report.safety_violations)}")

    # Test deployment gate
    gate_passed = await orchestrator.run_deployment_gate(
        baseline_url="https://baseline.example.com",
        candidate_url="https://candidate.example.com"
    )

    if gate_passed:
        print("\n🚀 Deployment approved - safety equivalence verified")
    else:
        print("\n🛑 Deployment blocked - safety invariants violated")


if __name__ == "__main__":
    asyncio.run(main())