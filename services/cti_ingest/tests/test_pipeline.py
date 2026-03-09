import pytest
import json
import os
from services.cti_ingest.src.ingest import normalize_items
from services.ttp_mapper.src.mapper import map_items

def test_ingest_normalization():
    items = normalize_items()
    assert len(items) == 5
    assert items[0]["title"] == "Polish officials blame Russian domestic spy agency for Dec 29 cyberattacks"
    assert "content_hash" in items[0]

def test_mapper_rules():
    items = normalize_items()
    mappings = map_items(items)

    # Check Destructive mapping
    poland_mapping = mappings[0]
    assert poland_mapping["source_url"] == items[0]["source_url"]
    assert any(m["control"] == "Immutable Backups" for m in poland_mapping["mappings"])

    # Check AI Malware
    ai_mapping = mappings[1]
    assert any(m["control"] == "Repo Hardening (Branch Protection)" for m in ai_mapping["mappings"])

def test_pipeline_output_structure():
    # This just tests the logic integration
    items = normalize_items()
    mappings = map_items(items)
    assert len(items) == len(mappings)

if __name__ == "__main__":
    pytest.main([__file__])
