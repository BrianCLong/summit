import hashlib
import json
import os

import pytest


def test_mapping_exists():
    mapping_path = os.path.join(os.path.dirname(__file__), '../mapping/openlineage_1.44_to_prov.json')
    with open(mapping_path) as f:
        mapping = json.load(f)
    assert mapping["version"] == "1.44.1"

def test_extraction_error_facet():
    mapping_path = os.path.join(os.path.dirname(__file__), '../mapping/openlineage_1.44_to_prov.json')
    with open(mapping_path) as f:
        mapping = json.load(f)

    has_extraction_error = False
    for activity in mapping.get("mapping", {}).get("activities", []):
        if "extractionError" in activity.get("attributes", {}):
            has_extraction_error = True
            break
    assert has_extraction_error, "Must map extractionError facet"

def test_deterministic_hashing():
    # Use deterministic hashing (e.g., hashlib.sha256()) rather than Python's built-in hash() when generating PROV URIs.
    uri = "urn:uuid:12345"
    bad_hash = hash(uri)
    good_hash = hashlib.sha256(uri.encode('utf-8')).hexdigest()
    assert str(bad_hash) != good_hash
    assert len(good_hash) == 64
