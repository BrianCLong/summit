import pytest
from summit.slopguard.dataset_hygiene import validate_dataset_provenance

def test_hygiene_disabled():
    policy = {"feature_flags": {"dataset_pollution_firewall": False}}
    results = validate_dataset_provenance({}, policy)
    assert results["status"] == "DISABLED"

def test_hygiene_enabled_polluted():
    policy = {"feature_flags": {"dataset_pollution_firewall": True}}
    meta = {
        "source_type": "llm",
        "collection_method": "scraping",
        "integrity_hash": "sha256:123",
        "samples": [
            "As an AI language model, I conclusion important note.",
            "In conclusion, this highlights the importance of tapestry."
        ]
    }
    results = validate_dataset_provenance(meta, policy)
    assert results["status"] == "ACTIVE"
    assert not results["valid"]
    assert any(i.startswith("HIGH_SLOP_INFILTRATION") for i in results["issues"])

def test_hygiene_enabled_clean():
    policy = {"feature_flags": {"dataset_pollution_firewall": True}}
    meta = {
        "source_type": "human",
        "collection_method": "manual",
        "integrity_hash": "sha256:456",
        "samples": [
            "This is a legitimate data sample with unique content.",
            "Another clean record for the training set."
        ]
    }
    results = validate_dataset_provenance(meta, policy)
    assert results["status"] == "ACTIVE"
    assert results["valid"]
