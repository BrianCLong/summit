"""Homegrown policy adapter for bespoke Summit+MC controls."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from ..models.base import (
    ImpactDimension,
    MultiFactorScore,
    PolicyEvaluationResult,
    PolicyFinding,
    RegulatoryRequirement,
    Severity,
)
from .base import PolicyAdapter


class HomegrownAdapter(PolicyAdapter):
    """Adapter that evaluates Summit/MC custom controls and scoring models."""

    def __init__(self) -> None:
        super().__init__("homegrown")

    def evaluate(self, workspace: Path) -> PolicyEvaluationResult:
        config_path = workspace / "configs" / "infrastructure.json"
        control_path = workspace / "policies" / "homegrown_controls.json"
        infra = json.loads(config_path.read_text())
        controls = json.loads(control_path.read_text())

        findings: List[PolicyFinding] = []
        metrics: Dict[str, float] = {}

        for control in controls["controls"]:
            if control["id"] == "MC-CUST-001":
                prod_ns = next(
                    (ns for ns in infra["kubernetes"]["namespaces"] if ns["name"] == "prod"),
                    None,
                )
                if prod_ns and not prod_ns.get("network_policy"):
                    findings.append(
                        PolicyFinding(
                            control_id=control["id"],
                            title=control["title"],
                            description=control["description"],
                            severity=Severity.CRITICAL,
                            impacted_assets=["k8s.namespace.prod"],
                            remediation="Deploy Calico baseline deny-all with service mesh segmentation.",
                            evidences=["kubernetes/namespaces/prod.yaml"],
                            references=list(control["requirements"]),
                        )
                    )
            elif control["id"] == "SUM-OPS-014":
                if infra["runtime"].get("guardduty_findings", 0) > 0:
                    findings.append(
                        PolicyFinding(
                            control_id=control["id"],
                            title=control["title"],
                            description=control["description"],
                            severity=Severity.HIGH,
                            impacted_assets=["aws.guardduty"],
                            remediation="Enable automated GuardDuty to Security Hub workflow with budget-aware remediation lambdas.",
                            evidences=["runtime/guardduty.json"],
                            references=list(control["requirements"]),
                        )
                    )

        metrics["controls_evaluated"] = len(controls["controls"])
        coverage = 1.0
        return PolicyEvaluationResult(adapter=self.name, findings=findings, metrics=metrics, coverage=coverage)

    def scoring(self, findings: List[PolicyFinding]) -> MultiFactorScore:
        penalty = sum(
            {
                Severity.CRITICAL: 35,
                Severity.HIGH: 25,
                Severity.MEDIUM: 10,
                Severity.LOW: 5,
                Severity.INFO: 1,
            }[finding.severity]
            for finding in findings
        )
        base = 95
        floor = 5
        economic = max(base - penalty * 0.6, floor)
        risk = max(base - penalty, floor)
        legal = max(base - penalty * 0.8, floor)
        rationale = "Scores derived from composite of drift severity, incident cost modeling, and regulatory posture."  # noqa: E501
        return MultiFactorScore(
            scores={
                ImpactDimension.ECONOMIC: round(economic, 2),
                ImpactDimension.RISK: round(risk, 2),
                ImpactDimension.LEGAL: round(legal, 2),
            },
            rationale=rationale,
        )

    def regulatory_alignment(self) -> dict[str, List[RegulatoryRequirement]]:
        return {
            "MC-CUST-001": [
                RegulatoryRequirement(
                    framework="GDPR",
                    citation="Article 32",
                    description="Requires state of the art security to protect personal data.",
                    surpass_criteria="Microsegmented network mesh with automated drift detection and remediation <5 minutes.",
                ),
                RegulatoryRequirement(
                    framework="HIPAA",
                    citation="164.308(a)(4)",
                    description="Information access management with technical policies to protect ePHI.",
                    surpass_criteria="Zero-trust service mesh enforcement with continuous verification and cryptographic audit trail.",
                ),
            ],
            "SUM-OPS-014": [
                RegulatoryRequirement(
                    framework="ISO 27001",
                    citation="A.12.1",
                    description="Operational planning and control requirements.",
                    surpass_criteria="Autonomous budget-aware scaling with closed-loop guardrail enforcement.",
                ),
                RegulatoryRequirement(
                    framework="FedRAMP",
                    citation="CM-2",
                    description="Baseline configuration enforcement.",
                    surpass_criteria="Automated config baselines with drift auto-rollback and human-in-the-loop sign-off.",
                ),
            ],
        }
