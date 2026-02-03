from typing import Any, Dict


def validate_campaign(data: dict[str, Any]) -> None:
    required_fields = {
        "campaign_id", "time_window", "root_entities",
        "subgraph_ref", "features", "governance"
    }
    allowed_fields = required_fields | {"labels", "explanation_id"}

    # Check for unknown fields (deny-by-default)
    keys = set(data.keys())
    unknown = keys - allowed_fields
    if unknown:
        raise ValueError(f"Unknown fields in CampaignSubgraph: {unknown}")

    # Check governance
    gov = data.get("governance", {})
    if not isinstance(gov, dict):
        raise ValueError("governance must be a dictionary")

    gov_required = {"classification", "retention_ttl_days", "provenance"}
    if not gov_required.issubset(gov.keys()):
        raise ValueError(f"Missing governance fields: {gov_required - gov.keys()}")

    # Check time_window
    tw = data.get("time_window", {})
    if not isinstance(tw, dict):
        raise ValueError("time_window must be a dictionary")
    if not {"start_iso", "end_iso"}.issubset(tw.keys()):
         raise ValueError("time_window must have start_iso and end_iso")
