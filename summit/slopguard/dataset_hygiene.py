from typing import Any, Dict, List

from summit.slopguard.scoring import get_slop_score


def validate_dataset_provenance(dataset_meta: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    """
    Ensures datasets have required provenance tags and checks for slop infiltration.
    """
    flags = policy.get("feature_flags", {})
    if not flags.get("dataset_pollution_firewall", False):
        return {"status": "DISABLED", "valid": True}

    required_tags = ["source_type", "collection_method", "integrity_hash"]
    missing_tags = [t for t in required_tags if t not in dataset_meta]

    issues = []
    if missing_tags:
        issues.append(f"MISSING_PROVENANCE_TAGS: {missing_tags}")

    if dataset_meta.get("source_type") == "unknown":
        issues.append("UNKNOWN_SOURCE_TYPE: Dataset source must be specified")

    # Sample-based slop check
    samples = dataset_meta.get("samples", [])
    slop_scores = []
    for sample in samples:
        res = get_slop_score(sample)
        slop_scores.append(res["score"])

    avg_slop = sum(slop_scores) / len(slop_scores) if slop_scores else 0.0

    if avg_slop > 0.4: # Threshold for dataset pollution
        issues.append(f"HIGH_SLOP_INFILTRATION: {avg_slop:.2f}")

    return {
        "status": "ACTIVE",
        "valid": len(issues) == 0,
        "issues": issues,
        "metrics": {
            "avg_slop_infiltration": round(avg_slop, 4),
            "sample_count": len(samples)
        }
    }
