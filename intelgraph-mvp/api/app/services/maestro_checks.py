"""
Maestro governance and release gate checks.

This module provides helpers to validate whether runs meet release gate requirements
based on artifact metadata and governance policies.
"""

from typing import Any

from ..models.maestro import Artifact, Run


def check_release_gate(run: Run, artifacts: list[Artifact]) -> tuple[bool, dict[str, Any]]:
    """
    Check if a run meets the release gate requirements.

    Current requirements:
    - At least one artifact must have sbom_present=True
    - At least one artifact must have slsa_provenance_present=True
    - At least one artifact must have risk_assessment_present=True

    Args:
        run: The run to check
        artifacts: List of artifacts associated with the run

    Returns:
        Tuple of (passed: bool, details: dict) where details contains:
        - sbom_present: bool
        - slsa_provenance_present: bool
        - risk_assessment_present: bool
        - missing_requirements: list[str]
        - artifacts_count: int
    """
    if not artifacts:
        return False, {
            "sbom_present": False,
            "slsa_provenance_present": False,
            "risk_assessment_present": False,
            "missing_requirements": [
                "sbom",
                "slsa_provenance",
                "risk_assessment",
            ],
            "artifacts_count": 0,
            "message": "No artifacts found for run",
        }

    # Check if at least one artifact has each required field
    has_sbom = any(a.metadata_json.sbom_present for a in artifacts)
    has_slsa = any(a.metadata_json.slsa_provenance_present for a in artifacts)
    has_risk = any(a.metadata_json.risk_assessment_present for a in artifacts)

    missing = []
    if not has_sbom:
        missing.append("sbom")
    if not has_slsa:
        missing.append("slsa_provenance")
    if not has_risk:
        missing.append("risk_assessment")

    passed = has_sbom and has_slsa and has_risk

    details = {
        "sbom_present": has_sbom,
        "slsa_provenance_present": has_slsa,
        "risk_assessment_present": has_risk,
        "missing_requirements": missing,
        "artifacts_count": len(artifacts),
        "message": "Release gate passed" if passed else f"Missing: {', '.join(missing)}",
    }

    return passed, details


def validate_artifact_metadata(artifact: Artifact) -> tuple[bool, list[str]]:
    """
    Validate that an artifact has proper metadata.

    Args:
        artifact: The artifact to validate

    Returns:
        Tuple of (valid: bool, errors: list[str])
    """
    errors = []

    if not artifact.content_hash:
        errors.append("Missing content_hash")

    if not artifact.path_or_uri:
        errors.append("Missing path_or_uri")

    # Validate metadata_json structure
    if artifact.metadata_json is None:
        errors.append("Missing metadata_json")
    else:
        # Check that at least one governance flag is set
        if (
            not artifact.metadata_json.sbom_present
            and not artifact.metadata_json.slsa_provenance_present
            and not artifact.metadata_json.risk_assessment_present
        ):
            errors.append(
                "At least one governance flag (sbom_present, slsa_provenance_present, "
                "risk_assessment_present) should be True"
            )

    return len(errors) == 0, errors


def summarize_run_artifacts(artifacts: list[Artifact]) -> dict[str, Any]:
    """
    Summarize the artifacts for a run.

    Args:
        artifacts: List of artifacts to summarize

    Returns:
        Dictionary with artifact summary including counts by kind and governance status
    """
    summary = {
        "total_artifacts": len(artifacts),
        "by_kind": {},
        "governance": {
            "sbom_count": 0,
            "slsa_provenance_count": 0,
            "risk_assessment_count": 0,
        },
    }

    for artifact in artifacts:
        # Count by kind
        kind = artifact.kind.value
        summary["by_kind"][kind] = summary["by_kind"].get(kind, 0) + 1

        # Count governance artifacts
        if artifact.metadata_json.sbom_present:
            summary["governance"]["sbom_count"] += 1
        if artifact.metadata_json.slsa_provenance_present:
            summary["governance"]["slsa_provenance_count"] += 1
        if artifact.metadata_json.risk_assessment_present:
            summary["governance"]["risk_assessment_count"] += 1

    return summary
