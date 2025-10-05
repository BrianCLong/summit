"""Zero-touch compliance engine orchestrating policy adapters and remediation."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List

from .adapters.homegrown import HomegrownAdapter
from .adapters.kyverno import KyvernoAdapter
from .adapters.opa import OPAAdapter
from .adapters.sentinel import SentinelAdapter
from .models.base import (
    AutoPatchAction,
    ComplianceRunReport,
    HumanReviewItem,
    PolicyEvaluationResult,
    PolicyFinding,
    RegulatoryRequirement,
)


class ZeroTouchComplianceEngine:
    """Core compliance engine responsible for executing adapters and orchestrating workflows."""

    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace
        self.adapters = [OPAAdapter(), SentinelAdapter(), KyvernoAdapter(), HomegrownAdapter()]

    def execute(self) -> ComplianceRunReport:
        started_at = datetime.utcnow()
        evaluations: List[PolicyEvaluationResult] = []
        regulatory_alignment: Dict[str, List[RegulatoryRequirement]] = defaultdict(list)

        for adapter in self.adapters:
            evaluation = adapter.evaluate(self.workspace)
            evaluations.append(evaluation)
            alignment_method = getattr(adapter, "regulatory_alignment", None)
            if callable(alignment_method):
                for control, requirements in alignment_method().items():
                    regulatory_alignment[control].extend(requirements)

        all_findings = [finding for evaluation in evaluations for finding in evaluation.findings]
        auto_patches = self._build_auto_patches(all_findings)
        human_reviews = self._build_human_reviews(all_findings)
        scoring_adapter = next(adapter for adapter in self.adapters if isinstance(adapter, HomegrownAdapter))
        multi_factor_score = scoring_adapter.scoring(all_findings)
        validation_results = self._load_validation_results()
        tested_artifacts = self._collect_tested_artifacts()

        finished_at = datetime.utcnow()
        return ComplianceRunReport(
            started_at=started_at,
            finished_at=finished_at,
            evaluations=evaluations,
            auto_patches=auto_patches,
            human_reviews=human_reviews,
            multi_factor_score=multi_factor_score,
            regulatory_alignment=dict(regulatory_alignment),
            tested_artifacts=tested_artifacts,
            validation_results=validation_results,
        )

    def _build_auto_patches(self, findings: Iterable[PolicyFinding]) -> List[AutoPatchAction]:
        auto_patches: List[AutoPatchAction] = []
        for finding in findings:
            if finding.control_id == "OPA-S3-ENCRYPTION":
                auto_patches.append(
                    AutoPatchAction(
                        id="patch-s3-encryption",
                        description="Apply Terraform patch to enforce SSE-KMS on MC and Summit buckets.",
                        changes={
                            "terraform/modules/storage.tf": "resource \"aws_s3_bucket_server_side_encryption_configuration\" ...",
                        },
                        applies_to=["mc-storage", "summit-storage"],
                        estimated_savings=4200.0,
                        estimated_risk_reduction=0.35,
                    )
                )
            elif finding.control_id == "SENTINEL-AIM-LEAST-PRIVILEGE":
                auto_patches.append(
                    AutoPatchAction(
                        id="patch-iam-least-privilege",
                        description="Replace wildcard IAM policy with scoped roles and automated approval gates.",
                        changes={
                            "terraform/iam/policies/admin.json": "{\"Version\":\"2012-10-17\",...}",
                        },
                        applies_to=["iam.policy.admin"],
                        estimated_savings=2700.0,
                        estimated_risk_reduction=0.28,
                    )
                )
            elif finding.control_id.startswith("KYVERNO-NP-"):
                auto_patches.append(
                    AutoPatchAction(
                        id=f"patch-network-policy-{finding.control_id.split('-')[-1].lower()}",
                        description="Bootstrap zero-trust network policy set with Kyverno mutation policies.",
                        changes={
                            f"manifests/{finding.impacted_assets[0].split('.')[-1]}/network-policy.yaml": "apiVersion: networking.k8s.io/v1 ...",
                        },
                        applies_to=list(finding.impacted_assets),
                        estimated_savings=1500.0,
                        estimated_risk_reduction=0.22,
                    )
                )
            elif finding.control_id == "KYVERNO-RUNTIME-SCAN":
                auto_patches.append(
                    AutoPatchAction(
                        id="patch-runtime-cves",
                        description="Trigger Summit auto-patcher pipeline to rebuild vulnerable images and redeploy.",
                        changes={"ci/pipeline.yaml": "include: patch-runtime-cves"},
                        applies_to=["k8s.cluster.prod"],
                        estimated_savings=5200.0,
                        estimated_risk_reduction=0.4,
                    )
                )
        return auto_patches

    def _build_human_reviews(self, findings: Iterable[PolicyFinding]) -> List[HumanReviewItem]:
        human_reviews: List[HumanReviewItem] = []
        for finding in findings:
            if finding.severity.value in {"critical", "high"}:
                human_reviews.append(
                    HumanReviewItem(
                        control_id=finding.control_id,
                        question="Confirm enforcement timeline and business exception status?",
                        suggested_decision="Approve remediation",
                        rationale="High impact finding routed to legal, security, and finance for confirmation.",
                        stakeholders=["CISO", "GC", "FinOps"],
                    )
                )
        return human_reviews

    def _load_validation_results(self) -> Dict[str, Dict[str, float]]:
        test_suite_path = self.workspace / "test_suites" / "open_suite_results.json"
        suite = json.loads(test_suite_path.read_text())
        passed = sum(1 for case in suite["cases"] if case["status"] == "pass")
        failed = sum(1 for case in suite["cases"] if case["status"] == "fail")
        return {
            suite["suite"]: {
                "version": suite["version"],
                "passed": passed,
                "failed": failed,
                "pass_rate": round(passed / (passed + failed), 2) if (passed + failed) else 1.0,
            }
        }

    def _collect_tested_artifacts(self) -> List[str]:
        test_suite_path = self.workspace / "test_suites" / "open_suite_results.json"
        suite = json.loads(test_suite_path.read_text())
        artifacts = {evidence for case in suite["cases"] for evidence in case.get("evidence", [])}
        return sorted(artifacts)


class ComplianceOrchestrator:
    """Facade for invoking the zero-touch compliance engine and emitting artifacts."""

    def __init__(self, workspace: Path, output_dir: Path) -> None:
        self.engine = ZeroTouchComplianceEngine(workspace)
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> Path:
        report = self.engine.execute()
        report_path = self.output_dir / "compliance_audit_report.json"
        report_path.write_text(json.dumps(report.to_dict(), indent=2))
        return report_path
