import pytest
import os
import json
from summit.loaders.spec_loader import SpecLoader

def test_load_schemas(tmp_path):
    # Create a dummy schema in a temp dir
    specs_dir = tmp_path / "specs"
    specs_dir.mkdir()
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Test Spec",
        "type": "object"
    }
    with open(specs_dir / "test_spec.jsonschema", "w") as f:
        json.dump(schema, f)

    loader = SpecLoader(str(specs_dir))
    loaded = loader.get_schema("test_spec")
    assert loaded["title"] == "Test Spec"

def test_load_default_schemas():
    # Test loading from the actual repo directory
    # We rely on the SpecLoader finding the default path relative to itself
    loader = SpecLoader()
    mode_schema = loader.get_schema("mode_spec")
    assert mode_schema.get("title") == "Agent Mode"
