"""Maestro governance and release gate checks."""

import json
import os
import urllib.request
from typing import Any

from .models import Artifact
from .storage import MaestroStore


def check_companyos_policy(
    tenant_id: str, actor_id: str, kind: str, resource: str, context: dict = None
) -> dict:
    """Consult companyOS PDP for a policy decision."""
    base_url = os.environ.get("COMPANYOS_BASE_URL", "http://localhost:3000")
    url = f"{base_url}/api/v1/pdp/decide"
    payload = {
        "tenantId": tenant_id,
        "actorId": actor_id,
        "kind": kind,
        "resource": resource,
        "context": context or {},
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=2) as f:
            return json.loads(f.read().decode("utf-8"))
    except Exception as e:
        # Advisory mode fallback (fail-open)
        return {
            "decision": "allow",
            "reasons": [f"companyOS unreachable: {str(e)}"],
            "policyVersion": "fallback",
            "auditEventId": f"fallback-{os.getpid()}",
        }


class ReleaseGateResult:
    """Result of a release gate check."""

    def __init__(
        self,
        passed: bool,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        self.passed = passed
        self.message = message
        self.details = details or {}

    def __bool__(self) -> bool:
        """Allow using result in boolean context."""
        return self.passed

    def __repr__(self) -> str:
        return f"ReleaseGateResult(passed={self.passed}, message='{self.message}')"


def check_artifact_compliance(artifact: Artifact) -> bool:
    """Check if an artifact meets compliance requirements."""
    meta = artifact.metadata_json
    return meta.sbom_present and meta.slsa_provenance_present and meta.risk_assessment_present


def check_release_gate(store: MaestroStore, run_id: str) -> ReleaseGateResult:
    """
    Evaluate whether a run meets release gate requirements.

    Release gate requirements:
    - Run must exist and be in succeeded status
    - At least one artifact must have all three compliance flags set:
      - sbom_present: True
      - slsa_provenance_present: True
      - risk_assessment_present: True

    Args:
        store: MaestroStore instance
        run_id: ID of the run to check

    Returns:
        ReleaseGateResult with passed flag and details
    """
    # Check run exists
    run = store.get_run(run_id)
    if not run:
        return ReleaseGateResult(
            passed=False,
            message=f"Run {run_id} not found",
            details={"run_id": run_id},
        )

    # Check run succeeded
    if run.status != "succeeded":
        return ReleaseGateResult(
            passed=False,
            message=f"Run status is '{run.status}', must be 'succeeded'",
            details={"run_id": run_id, "status": run.status},
        )

    # Get artifacts for this run
    artifacts = store.list_artifacts(run_id=run_id)
    if not artifacts:
        return ReleaseGateResult(
            passed=False,
            message="No artifacts found for this run",
            details={"run_id": run_id, "artifact_count": 0},
        )

    # Check if at least one artifact is fully compliant
    compliant_artifacts = [a for a in artifacts if check_artifact_compliance(a)]

    if not compliant_artifacts:
        return ReleaseGateResult(
            passed=False,
            message="No artifacts meet compliance requirements (SBOM + SLSA provenance + risk assessment)",
            details={
                "run_id": run_id,
                "total_artifacts": len(artifacts),
                "compliant_artifacts": 0,
            },
        )

    # Success!
    return ReleaseGateResult(
        passed=True,
        message=f"Release gate passed: {len(compliant_artifacts)} compliant artifact(s) found",
        details={
            "run_id": run_id,
            "total_artifacts": len(artifacts),
            "compliant_artifacts": len(compliant_artifacts),
            "compliant_artifact_ids": [a.id for a in compliant_artifacts],
        },
    )


def emit_evidence_to_intelgraph(evidence: dict):
    """Emit governance evidence to IntelGraph."""
    url = f"{os.environ.get('INTELGRAPH_URL', 'http://localhost:4000')}/api/v1/ingest/companyos-decision"
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(evidence).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=2) as f:
            pass
    except Exception as e:
        print(f"Warning: Failed to emit evidence to IntelGraph: {str(e)}")


def check_run_policy_gate(
    tenant_id: str, actor_id: str, run_id: str, resource: str
) -> ReleaseGateResult:
    """Evaluate companyOS policy gate for a run."""
    decision = check_companyos_policy(tenant_id, actor_id, "JobStart", resource)

    passed = decision["decision"] == "allow" or os.environ.get("COMPANYOS_ENFORCE") != "1"
    message = f"companyOS policy {decision['decision']}"
    if decision["decision"] == "deny":
        message += f": {', '.join(decision['reasons'])}"

    # Emit evidence
    import datetime
    evidence = {
        "evidenceId": f"EVID:{tenant_id}:JobStart:{decision['auditEventId']}",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "tenantId": tenant_id,
        "actorId": actor_id,
        "kind": "JobStart",
        "resource": resource,
        "decision": decision["decision"],
        "reasons": decision["reasons"],
        "policyVersion": decision["policyVersion"],
        "auditEventId": decision["auditEventId"],
    }
    emit_evidence_to_intelgraph(evidence)

    return ReleaseGateResult(
        passed=passed,
        message=message,
        details={
            "run_id": run_id,
            "audit_event_id": decision["auditEventId"],
            "policy_version": decision["policyVersion"],
            "enforced": os.environ.get("COMPANYOS_ENFORCE") == "1",
        },
    )


def generate_compliance_report(store: MaestroStore, run_id: str) -> dict[str, Any]:
    """
    Generate a detailed compliance report for a run.

    Args:
        store: MaestroStore instance
        run_id: ID of the run to report on

    Returns:
        Dictionary with compliance status and artifact details
    """
    run = store.get_run(run_id)
    if not run:
        return {"error": f"Run {run_id} not found"}

    artifacts = store.list_artifacts(run_id=run_id)
    artifact_compliance = []

    for artifact in artifacts:
        meta = artifact.metadata_json
        artifact_compliance.append(
            {
                "artifact_id": artifact.id,
                "kind": artifact.kind,
                "sbom_present": meta.sbom_present,
                "slsa_provenance_present": meta.slsa_provenance_present,
                "risk_assessment_present": meta.risk_assessment_present,
                "compliant": check_artifact_compliance(artifact),
            }
        )

    gate_result = check_release_gate(store, run_id)

    return {
        "run_id": run_id,
        "run_name": run.name,
        "run_status": run.status,
        "release_gate_passed": gate_result.passed,
        "release_gate_message": gate_result.message,
        "artifacts": artifact_compliance,
        "summary": {
            "total_artifacts": len(artifacts),
            "compliant_artifacts": sum(1 for a in artifact_compliance if a["compliant"]),
        },
    }
