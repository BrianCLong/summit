"""OPA policy adapter simulation."""

from __future__ import annotations

import json
from pathlib import Path

from ..models.base import PolicyEvaluationResult, PolicyFinding, RegulatoryRequirement, Severity
from .base import PolicyAdapter


class OPAAdapter(PolicyAdapter):
    """Evaluates declarative policies that would normally be executed by OPA."""

    def __init__(self) -> None:
        super().__init__("opa")

    def evaluate(self, workspace: Path) -> PolicyEvaluationResult:
        config_path = workspace / "configs" / "infrastructure.json"
        data = json.loads(config_path.read_text())
        findings = []
        metrics = {"policies_executed": 4}

        if not data["terraform"].get("s3_encryption", False):
            findings.append(
                PolicyFinding(
                    control_id="OPA-S3-ENCRYPTION",
                    title="S3 server-side encryption is disabled",
                    description="Terraform module is missing encryption settings for S3 buckets.",
                    severity=Severity.CRITICAL,
                    impacted_assets=["terraform.modules.storage"],
                    remediation="Enable `server_side_encryption_configuration` with AWS KMS-managed keys.",
                    evidences=["terraform/modules/storage.tf"],
                    references=["GDPR Art. 32", "PCI-DSS 3.4"],
                )
            )

        if not data["terraform"].get("cost_center_tags", True):
            findings.append(
                PolicyFinding(
                    control_id="OPA-COST-TAGGING",
                    title="Cost center tags missing",
                    description="Resources are missing `owner` and `cost_center` tags required for chargeback.",
                    severity=Severity.MEDIUM,
                    impacted_assets=["terraform.modules.compute"],
                    remediation="Add mandatory tags through Terraform `default_tags`.",
                    evidences=["terraform/modules/compute.tf"],
                    references=["ISO 27001 A.8.1.1"],
                )
            )

        coverage = 1.0 if findings else 0.85
        return PolicyEvaluationResult(adapter=self.name, findings=findings, metrics=metrics, coverage=coverage)

    def regulatory_alignment(self) -> dict[str, list[RegulatoryRequirement]]:
        return {
            "OPA-S3-ENCRYPTION": [
                RegulatoryRequirement(
                    framework="GDPR",
                    citation="Article 32",
                    description="Requires appropriate technical measures including encryption.",
                    surpass_criteria="Automated enforcement across 100% of storage buckets with tamper-proof audit logs.",
                ),
                RegulatoryRequirement(
                    framework="PCI-DSS",
                    citation="3.4",
                    description="Protect stored cardholder data with strong cryptography.",
                    surpass_criteria="Continuous verification with auto-remediation within 15 minutes of drift.",
                ),
            ],
            "OPA-COST-TAGGING": [
                RegulatoryRequirement(
                    framework="ISO 27001",
                    citation="A.8.1.1",
                    description="Requires identification of assets within the scope of the ISMS.",
                    surpass_criteria="Dynamic asset inventory with financial tagging integrated to FinOps dashboards.",
                )
            ],
        }
