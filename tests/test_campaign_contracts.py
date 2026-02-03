import pytest

from summit.influence.campaigns.model import CampaignSubgraph
from summit.influence.campaigns.validators import validate_campaign


def test_campaign_validation_valid():
    data = {
        "campaign_id": "CMP-001",
        "time_window": {"start_iso": "2023-01-01", "end_iso": "2023-01-02"},
        "root_entities": ["node1", "node2"],
        "subgraph_ref": {"id": "G-123"},
        "features": {"density": 0.5},
        "governance": {
            "classification": "INTERNAL",
            "retention_ttl_days": 30,
            "provenance": "synthetic"
        }
    }
    # Should not raise
    validate_campaign(data)

def test_campaign_validation_unknown_field():
    data = {
        "campaign_id": "CMP-001",
        "time_window": {"start_iso": "2023-01-01", "end_iso": "2023-01-02"},
        "root_entities": [],
        "subgraph_ref": {},
        "features": {},
        "governance": {
            "classification": "INTERNAL",
            "retention_ttl_days": 30,
            "provenance": "synthetic"
        },
        "extra_field": "bad"
    }
    with pytest.raises(ValueError, match="Unknown fields"):
        validate_campaign(data)

def test_campaign_validation_missing_governance():
    data = {
        "campaign_id": "CMP-001",
        "time_window": {"start_iso": "2023-01-01", "end_iso": "2023-01-02"},
        "root_entities": [],
        "subgraph_ref": {},
        "features": {},
        "governance": {
            "classification": "INTERNAL"
            # Missing fields
        }
    }
    with pytest.raises(ValueError, match="Missing governance fields"):
        validate_campaign(data)
