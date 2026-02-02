from typing import Dict, Any, List

def verify_dataset_provenance(artifact: Dict[str, Any], policy: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates provenance tags for datasets.
    """
    meta = artifact.get("meta", {})
    source_type = meta.get("source_type", "unknown")
    collection_method = meta.get("collection_method")

    reasons = []
    allowed = True

    # Check if firewall is enabled in policy
    firewall_enabled = policy.get("feature_flags", {}).get("dataset_pollution_firewall", False)

    if source_type == "unknown":
        reasons.append("dataset_source_type_unknown")
        if firewall_enabled:
            allowed = False

    if not collection_method:
        reasons.append("dataset_missing_collection_method")
        if firewall_enabled:
            allowed = False

    return {
        "allowed": allowed,
        "reasons": reasons,
        "source_type": source_type
    }
