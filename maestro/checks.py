"""Maestro governance and release gate checks."""

from typing import Any

from .models import Artifact, Run
from .storage import MaestroStore


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
    return (
        meta.sbom_present
        and meta.slsa_provenance_present
        and meta.risk_assessment_present
    )


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
            "compliant_artifacts": sum(
                1 for a in artifact_compliance if a["compliant"]
            ),
        },
    }
