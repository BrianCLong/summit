import json
from pathlib import Path
import pytest
from summit.evidence.palantir import PalantirEvidenceWriter
from summit.integrations.palantir import PalantirImporter

@pytest.fixture
def sample_ontology():
    path = Path("tests/fixtures/palantir/ontology_sample.json")
    return json.loads(path.read_text())

def test_importer_objects(sample_ontology):
    importer = PalantirImporter({})
    schema = importer.import_ontology(sample_ontology)

    labels = [n["label"] for n in schema.nodes]
    assert "Person" in labels
    assert "Event" in labels

def test_importer_links(sample_ontology):
    importer = PalantirImporter({})
    schema = importer.import_ontology(sample_ontology)

    assert len(schema.edges) == 1
    edge = schema.edges[0]
    assert edge["label"] == "Person_attended_Event"
    assert edge["source_type"] == "Person"
    assert edge["target_type"] == "Event"

def test_importer_invalid_link_reference():
    # Define an ontology where a link references a missing object type
    ontology = {
        "objectTypes": [{"apiName": "A", "properties": {}}],
        "linkTypes": [
            {"apiName": "A_to_B", "sourceObjectType": "A", "targetObjectType": "B"} # B is missing
        ]
    }
    importer = PalantirImporter({})
    schema = importer.import_ontology(ontology)

    # Should skip the invalid edge
    assert len(schema.edges) == 0

def test_evidence_determinism(tmp_path):
    writer = PalantirEvidenceWriter(
        root_dir=tmp_path,
        git_sha="abcdef123456",
        scenario="security_test"
    )

    findings = [{"workflow": "ingest", "status": "parity", "gap_analysis": "none"}]
    metrics = {"runtime_ms": 100.0, "memory_mb": 50.0, "cost_usd_est": 0.01}
    config = {"foo": "bar"}

    paths = writer.write_artifacts("Summary", findings, metrics, config)

    assert paths.report.exists()
    stamp = json.loads(paths.stamp.read_text())
    assert stamp["git_sha"] == "abcdef123456"

def test_never_log_secrets(caplog):
    """
    Ensure the importer doesn't log sensitive properties found in ontology.
    """
    import logging
    ontology = {
        "objectTypes": [{
            "apiName": "SecretAgent",
            "properties": {"ssn": "123-45", "auth_token": "xyz"}
        }]
    }
    importer = PalantirImporter({})

    with caplog.at_level(logging.INFO):
        importer.import_ontology(ontology)

    # Assert that sensitive values are NOT in the logs
    for record in caplog.records:
        assert "123-45" not in record.message
        assert "xyz" not in record.message
