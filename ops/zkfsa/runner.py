#!/usr/bin/env python3
"""
zk-Fairness & Safety Audits (ZKFSA) Runner
MC Platform v0.3.8 - Quantum-Ready Equilibrium

Orchestrates automated fairness and safety audits using zero-knowledge proofs.
Provides continuous compliance monitoring without exposing sensitive tenant data.
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
import logging

from .circuits import ZKFSACircuit, ZKFSAProof, create_demo_circuits

logger = logging.getLogger(__name__)

@dataclass
class AuditConfiguration:
    """ZKFSA audit configuration"""
    tenant_id: str
    fairness_threshold: float = 0.8
    safety_threshold: float = 0.95
    audit_interval_hours: int = 6
    protected_attributes: List[str] = None
    safety_policies: List[str] = None
    auto_remediation: bool = True
    notification_webhook: Optional[str] = None

@dataclass
class AuditResult:
    """Complete audit result with recommendations"""
    audit_id: str
    tenant_id: str
    timestamp: str
    fairness_proof: ZKFSAProof
    safety_proof: ZKFSAProof
    overall_compliance: bool
    fairness_score: float
    safety_score: float
    recommendations: List[str]
    remediation_actions: List[str]

class ZKFSARunner:
    """ZKFSA audit orchestration engine

    Coordinates continuous fairness and safety audits using zero-knowledge proofs.
    Provides automated compliance monitoring, alerting, and remediation.

    SLA: <30s end-to-end audit, >99.5% privacy preservation, 24/7 monitoring
    """

    def __init__(self, configurations: List[AuditConfiguration]):
        self.configurations = {config.tenant_id: config for config in configurations}
        self.audit_history: Dict[str, List[AuditResult]] = {}
        self.running_audits: Dict[str, asyncio.Task] = {}

        # Performance metrics
        self.total_audits = 0
        self.successful_audits = 0
        self.failed_audits = 0
        self.total_audit_time = 0.0

        logger.info(f"ZKFSA Runner initialized: {len(configurations)} tenant configurations")

    async def start_continuous_auditing(self):
        """Start continuous audit monitoring for all configured tenants"""
        logger.info("Starting continuous ZKFSA auditing...")

        for tenant_id, config in self.configurations.items():
            # Start audit task for each tenant
            task = asyncio.create_task(self._audit_loop(config))
            self.running_audits[tenant_id] = task

        await asyncio.gather(*self.running_audits.values(), return_exceptions=True)

    async def run_manual_audit(self, tenant_id: str) -> AuditResult:
        """Run immediate manual audit for specific tenant"""
        if tenant_id not in self.configurations:
            raise ValueError(f"No configuration found for tenant: {tenant_id}")

        config = self.configurations[tenant_id]
        return await self._execute_audit(config)

    async def _audit_loop(self, config: AuditConfiguration):
        """Continuous audit loop for a single tenant"""
        while True:
            try:
                # Execute audit
                result = await self._execute_audit(config)

                # Store result
                if config.tenant_id not in self.audit_history:
                    self.audit_history[config.tenant_id] = []
                self.audit_history[config.tenant_id].append(result)

                # Trim history (keep last 30 days)
                cutoff = datetime.now(timezone.utc) - timedelta(days=30)
                self.audit_history[config.tenant_id] = [
                    r for r in self.audit_history[config.tenant_id]
                    if datetime.fromisoformat(r.timestamp.replace('Z', '+00:00')) > cutoff
                ]

                # Handle non-compliance
                if not result.overall_compliance:
                    await self._handle_non_compliance(config, result)

                # Send notifications if configured
                if config.notification_webhook:
                    await self._send_notification(config, result)

                logger.info(f"Audit completed for {config.tenant_id}: "
                           f"compliance={result.overall_compliance}, "
                           f"fairness={result.fairness_score:.3f}, "
                           f"safety={result.safety_score:.3f}")

                # Wait for next audit interval
                await asyncio.sleep(config.audit_interval_hours * 3600)

            except Exception as e:
                logger.error(f"Audit loop error for {config.tenant_id}: {e}")
                self.failed_audits += 1
                await asyncio.sleep(300)  # 5min retry delay

    async def _execute_audit(self, config: AuditConfiguration) -> AuditResult:
        """Execute complete fairness and safety audit"""
        start_time = time.time()
        self.total_audits += 1

        try:
            # Generate audit ID
            audit_id = f"zkfsa_{config.tenant_id}_{int(time.time())}"

            # Get tenant model outputs (simulated for demo)
            model_outputs = await self._get_tenant_model_outputs(config.tenant_id)

            # Create circuits
            fairness_circuit = ZKFSACircuit("fairness", config.tenant_id)
            safety_circuit = ZKFSACircuit("safety", config.tenant_id)

            # Generate fairness proof
            fairness_proof = fairness_circuit.generate_fairness_proof(
                model_outputs=model_outputs,
                protected_attributes=config.protected_attributes or ["gender", "race", "age"],
                threshold=config.fairness_threshold
            )

            # Generate safety proof
            safety_proof = safety_circuit.generate_safety_proof(
                model_outputs=model_outputs,
                safety_policies=config.safety_policies or ["no_harm", "no_bias", "content_filter"],
                threshold=config.safety_threshold
            )

            # Determine overall compliance
            fairness_compliant = fairness_proof.fairness_score >= config.fairness_threshold
            safety_compliant = safety_proof.safety_score >= config.safety_threshold
            overall_compliance = fairness_compliant and safety_compliant

            # Generate recommendations
            recommendations = self._generate_recommendations(
                fairness_proof.fairness_score,
                safety_proof.safety_score,
                config
            )

            # Generate remediation actions
            remediation_actions = self._generate_remediation_actions(
                fairness_proof.fairness_score,
                safety_proof.safety_score,
                config
            )

            # Create audit result
            result = AuditResult(
                audit_id=audit_id,
                tenant_id=config.tenant_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                fairness_proof=fairness_proof,
                safety_proof=safety_proof,
                overall_compliance=overall_compliance,
                fairness_score=fairness_proof.fairness_score,
                safety_score=safety_proof.safety_score,
                recommendations=recommendations,
                remediation_actions=remediation_actions
            )

            # Update metrics
            audit_time = time.time() - start_time
            self.total_audit_time += audit_time
            self.successful_audits += 1

            logger.info(f"Audit executed: {audit_id}, time={audit_time:.2f}s, "
                       f"compliance={overall_compliance}")

            return result

        except Exception as e:
            self.failed_audits += 1
            logger.error(f"Audit execution error: {e}")
            raise

    async def _get_tenant_model_outputs(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get recent model outputs for tenant (simulated)"""
        # Simulate fetching recent model decisions and outputs
        # In production, this would query the tenant's model serving infrastructure
        return [
            {
                "decision_id": f"dec_{i}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model_output": {"prediction": 0.8, "confidence": 0.9},
                "input_features": {"age": 35, "income": 50000},
                "protected_attributes": {"gender": "F", "race": "Hispanic"},
                "safety_labels": {"harmful": False, "biased": False, "safe": True}
            }
            for i in range(100)  # Simulate 100 recent decisions
        ]

    def _generate_recommendations(self, fairness_score: float, safety_score: float,
                                config: AuditConfiguration) -> List[str]:
        """Generate compliance improvement recommendations"""
        recommendations = []

        if fairness_score < config.fairness_threshold:
            gap = config.fairness_threshold - fairness_score
            if gap > 0.1:
                recommendations.append("CRITICAL: Implement bias mitigation techniques immediately")
                recommendations.append("Review model training data for demographic imbalances")
            else:
                recommendations.append("Fine-tune model fairness with adversarial debiasing")

        if safety_score < config.safety_threshold:
            gap = config.safety_threshold - safety_score
            if gap > 0.05:
                recommendations.append("URGENT: Strengthen content safety filters")
                recommendations.append("Implement additional harm prevention measures")
            else:
                recommendations.append("Optimize safety detection thresholds")

        if fairness_score >= config.fairness_threshold and safety_score >= config.safety_threshold:
            recommendations.append("Excellent compliance! Maintain current practices")
            recommendations.append("Consider participating in fairness research initiatives")

        return recommendations

    def _generate_remediation_actions(self, fairness_score: float, safety_score: float,
                                    config: AuditConfiguration) -> List[str]:
        """Generate automated remediation actions"""
        actions = []

        if config.auto_remediation:
            if fairness_score < config.fairness_threshold:
                actions.append("AUTO: Enable fairness-aware routing")
                actions.append("AUTO: Activate demographic parity constraints")

            if safety_score < config.safety_threshold:
                actions.append("AUTO: Increase safety filter sensitivity")
                actions.append("AUTO: Enable human-in-the-loop for marginal cases")

        return actions

    async def _handle_non_compliance(self, config: AuditConfiguration, result: AuditResult):
        """Handle non-compliance scenarios"""
        logger.warning(f"Non-compliance detected for {config.tenant_id}: "
                      f"fairness={result.fairness_score:.3f}, "
                      f"safety={result.safety_score:.3f}")

        # Execute auto-remediation if enabled
        if config.auto_remediation and result.remediation_actions:
            for action in result.remediation_actions:
                if action.startswith("AUTO:"):
                    await self._execute_remediation_action(action, config)

    async def _execute_remediation_action(self, action: str, config: AuditConfiguration):
        """Execute automated remediation action"""
        logger.info(f"Executing remediation: {action} for {config.tenant_id}")
        # Simulate remediation action execution
        await asyncio.sleep(1)

    async def _send_notification(self, config: AuditConfiguration, result: AuditResult):
        """Send audit result notification"""
        # Simulate sending notification to webhook
        logger.info(f"Sending notification for {config.tenant_id} to {config.notification_webhook}")

    def get_tenant_audit_history(self, tenant_id: str, days: int = 7) -> List[AuditResult]:
        """Get audit history for tenant"""
        if tenant_id not in self.audit_history:
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return [
            result for result in self.audit_history[tenant_id]
            if datetime.fromisoformat(result.timestamp.replace('Z', '+00:00')) > cutoff
        ]

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get runner performance metrics"""
        avg_audit_time = self.total_audit_time / max(self.total_audits, 1)
        success_rate = self.successful_audits / max(self.total_audits, 1)

        return {
            "total_audits": self.total_audits,
            "successful_audits": self.successful_audits,
            "failed_audits": self.failed_audits,
            "success_rate_pct": success_rate * 100,
            "avg_audit_time_s": avg_audit_time,
            "sla_compliance_pct": 100.0 if avg_audit_time < 30 else 0.0,  # <30s SLA
            "active_tenants": len(self.configurations),
            "running_audits": len(self.running_audits)
        }

    async def stop_auditing(self):
        """Stop all audit monitoring"""
        logger.info("Stopping ZKFSA auditing...")
        for task in self.running_audits.values():
            task.cancel()

        await asyncio.gather(*self.running_audits.values(), return_exceptions=True)
        self.running_audits.clear()


if __name__ == "__main__":
    # Demo usage
    async def demo():
        # Create configurations
        configs = [
            AuditConfiguration(
                tenant_id="TENANT_001",
                fairness_threshold=0.8,
                safety_threshold=0.95,
                audit_interval_hours=1,  # More frequent for demo
                auto_remediation=True
            ),
            AuditConfiguration(
                tenant_id="TENANT_002",
                fairness_threshold=0.85,
                safety_threshold=0.98,
                audit_interval_hours=2,
                auto_remediation=False
            )
        ]

        # Create runner
        runner = ZKFSARunner(configs)

        # Run manual audits
        print("=== ZKFSA Runner Demo ===")
        for config in configs:
            result = await runner.run_manual_audit(config.tenant_id)
            print(f"Audit {result.audit_id}: compliance={result.overall_compliance}, "
                  f"fairness={result.fairness_score:.3f}, safety={result.safety_score:.3f}")

        print(f"Performance: {runner.get_performance_metrics()}")

    # Run demo
    asyncio.run(demo())