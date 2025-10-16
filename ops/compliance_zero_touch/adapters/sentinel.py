"""HashiCorp Sentinel policy adapter simulation."""

from __future__ import annotations

import json
from pathlib import Path

from ..models.base import PolicyEvaluationResult, PolicyFinding, RegulatoryRequirement, Severity
from .base import PolicyAdapter


class SentinelAdapter(PolicyAdapter):
    """Adapter for evaluating infrastructure-as-code policies through Sentinel."""

    def __init__(self) -> None:
        super().__init__("sentinel")

    def evaluate(self, workspace: Path) -> PolicyEvaluationResult:
        config_path = workspace / "configs" / "infrastructure.json"
        data = json.loads(config_path.read_text())
        findings = []
        metrics = {"policies_executed": 3}

        overly_permissive = [
            policy["name"]
            for policy in data["terraform"].get("iam_policies", [])
            if policy.get("permissions") == "*"
        ]
        if overly_permissive:
            findings.append(
                PolicyFinding(
                    control_id="SENTINEL-AIM-LEAST-PRIVILEGE",
                    title="IAM policy grants wildcard permissions",
                    description="Sentinel detected IAM policy configured with `*` permissions.",
                    severity=Severity.HIGH,
                    impacted_assets=[f"iam.policy.{name}" for name in overly_permissive],
                    remediation="Split administrative duties into scoped roles and enforce MFA.",
                    evidences=["terraform/iam/policies/admin.json"],
                    references=["HIPAA 164.308(a)(3)", "FedRAMP AC-6"],
                )
            )

        coverage = 0.9
        return PolicyEvaluationResult(
            adapter=self.name, findings=findings, metrics=metrics, coverage=coverage
        )

    def regulatory_alignment(self) -> dict[str, list[RegulatoryRequirement]]:
        return {
            "SENTINEL-AIM-LEAST-PRIVILEGE": [
                RegulatoryRequirement(
                    framework="HIPAA",
                    citation="164.308(a)(3)",
                    description="Workforce security standard requiring authorization and supervision.",
                    surpass_criteria="Automated detection with conditional access enforcement and auto-remediation.",
                ),
                RegulatoryRequirement(
                    framework="FedRAMP",
                    citation="AC-6",
                    description="Least privilege principle for federal systems.",
                    surpass_criteria="Continuous IAM posture scoring with rollback of privilege escalation in <10 minutes.",
                ),
            ]
        }
