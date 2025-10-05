"""Kyverno policy adapter simulation."""

from __future__ import annotations

import json
from pathlib import Path

from ..models.base import PolicyEvaluationResult, PolicyFinding, RegulatoryRequirement, Severity
from .base import PolicyAdapter


class KyvernoAdapter(PolicyAdapter):
    """Adapter for validating Kubernetes manifests with Kyverno policies."""

    def __init__(self) -> None:
        super().__init__("kyverno")

    def evaluate(self, workspace: Path) -> PolicyEvaluationResult:
        config_path = workspace / "configs" / "infrastructure.json"
        data = json.loads(config_path.read_text())
        findings = []
        metrics = {"policies_executed": 5}

        for namespace in data["kubernetes"].get("namespaces", []):
            if not namespace.get("network_policy", False):
                findings.append(
                    PolicyFinding(
                        control_id=f"KYVERNO-NP-{namespace['name'].upper()}",
                        title=f"Namespace {namespace['name']} missing network policy",
                        description="Kyverno detected missing default deny network policy for the namespace.",
                        severity=Severity.HIGH,
                        impacted_assets=[f"k8s.namespace.{namespace['name']}"],
                        remediation="Apply a Kyverno policy to enforce baseline network policies.",
                        evidences=[f"manifests/{namespace['name']}/namespace.yaml"],
                        references=["ISO 27001 A.13.1.1", "FedRAMP SC-7"],
                    )
                )
            if namespace.get("image_pull_policy") != "Always":
                findings.append(
                    PolicyFinding(
                        control_id=f"KYVERNO-IMAGE-PULL-{namespace['name'].upper()}",
                        title=f"Namespace {namespace['name']} using non-Always image pull policy",
                        description="Non-Always policies risk stale container images bypassing security patches.",
                        severity=Severity.MEDIUM,
                        impacted_assets=[f"k8s.namespace.{namespace['name']}"],
                        remediation="Set `imagePullPolicy: Always` on deployments handling regulated workloads.",
                        evidences=[f"manifests/{namespace['name']}/deployment.yaml"],
                        references=["HIPAA 164.312(c)(1)", "GDPR Art. 25"],
                    )
                )

        runtime_scans = data["kubernetes"].get("runtime_scans", {})
        if runtime_scans.get("critical_vulnerabilities", 0) > 0:
            findings.append(
                PolicyFinding(
                    control_id="KYVERNO-RUNTIME-SCAN",
                    title="Runtime scan detected critical vulnerabilities",
                    description="Container runtime scan surfaced critical CVEs requiring patching.",
                    severity=Severity.CRITICAL,
                    impacted_assets=["k8s.cluster.prod"],
                    remediation="Initiate rolling patch workflow via Summit auto-patcher.",
                    evidences=["trivy/reports/prod.json"],
                    references=["PCI-DSS 6.3", "HIPAA 164.308(a)(1)(ii)(D)"],
                )
            )

        coverage = 0.95 if findings else 0.75
        return PolicyEvaluationResult(adapter=self.name, findings=findings, metrics=metrics, coverage=coverage)

    def regulatory_alignment(self) -> dict[str, list[RegulatoryRequirement]]:
        return {
            "KYVERNO-RUNTIME-SCAN": [
                RegulatoryRequirement(
                    framework="PCI-DSS",
                    citation="6.3",
                    description="Maintain secure systems and applications.",
                    surpass_criteria="Runtime blocking of exploitable workloads with automated patch rollouts in <30 minutes.",
                ),
                RegulatoryRequirement(
                    framework="HIPAA",
                    citation="164.308(a)(1)(ii)(D)",
                    description="Information system activity review including audit logs, access, and security incidents.",
                    surpass_criteria="Continuous runtime scanning with correlated SIEM alerts and auto-quarantine.",
                ),
            ]
        }
