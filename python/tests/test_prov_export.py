import json

import pytest
from intelgraph_py.provenance.exporter import ProvenanceExporter


def test_export_simple_graph():
    exporter = ProvenanceExporter()
    exporter.add_entity("e1", "Entity 1")
    exporter.add_activity("a1", attributes={"foo": "bar"})
    exporter.was_generated_by("e1", "a1")

    json_output = exporter.export_json()
    data = json.loads(json_output)

    # Check that output is valid PROV-JSON
    # Note: prov library output structure might vary slightly but generally has these keys
    assert "entity" in data
    assert "activity" in data
    assert "wasGeneratedBy" in data

    # Check content (keys in the dicts)
    # The prov library usually keys by full QName, so we check if any key ends with 'e1' or matches
    # Since we set default namespace, it might be 'http://summit.example.org/e1'

    entities = data["entity"]
    # We look for a key that contains 'e1'
    assert any("e1" in k for k in entities.keys())

    activities = data["activity"]
    assert any("a1" in k for k in activities.keys())
