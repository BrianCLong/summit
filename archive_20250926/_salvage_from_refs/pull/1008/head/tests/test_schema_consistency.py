import json
from pathlib import Path

SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schema"


def load_version(version: str):
    nodes = json.loads((SCHEMA_DIR / f"graph_versions/{version}/nodes.json").read_text())
    rels = json.loads((SCHEMA_DIR / f"graph_versions/{version}/relationships.json").read_text())
    return nodes, rels


def test_nodes_have_mandatory_fields():
    version = (SCHEMA_DIR / "active_version.txt").read_text().strip()
    nodes, _ = load_version(version)
    for label, spec in nodes.items():
        for field, meta in spec["fields"].items():
            assert "type" in meta
            assert "mandatory" in meta


def test_relationships_reference_existing_nodes():
    version = (SCHEMA_DIR / "active_version.txt").read_text().strip()
    nodes, rels = load_version(version)
    for name, spec in rels.items():
        assert spec["from"] in nodes
        assert spec["to"] in nodes
