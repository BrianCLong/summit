import json
from pathlib import Path

import pytest

from summit.plugins.validator import validate_spp


@pytest.fixture
def valid_manifest(tmp_path):
    manifest = {
        "pack_id": "test_pack",
        "version": "1.0.0",
        "tools": [{"name": "tool1", "scope": "read"}],
        "commands": [{"name": "cmd1", "template": "hello"}],
        "sub_agents": [{"name": "agent1", "prompt": "be helpful", "tool_scope": ["tool1"]}],
        "policies": {"deny_by_default": True}
    }
    p = tmp_path / "spp.json"
    p.write_text(json.dumps(manifest))
    return p

def test_validate_valid_manifest(valid_manifest):
    errors = validate_spp(valid_manifest)
    assert not errors

def test_validate_missing_required_field(tmp_path):
    manifest = {
        "pack_id": "test_pack",
        "version": "1.0.0"
        # missing tools, commands, sub_agents, policies
    }
    p = tmp_path / "spp_invalid.json"
    p.write_text(json.dumps(manifest))
    errors = validate_spp(p)
    assert len(errors) > 0
    assert "schema validation error" in errors[0]

def test_validate_invalid_pack_id(tmp_path):
    manifest = {
        "pack_id": "INVALID PACK ID!",
        "version": "1.0.0",
        "tools": [],
        "commands": [],
        "sub_agents": [],
        "policies": {"deny_by_default": True}
    }
    p = tmp_path / "spp_invalid_id.json"
    p.write_text(json.dumps(manifest))
    errors = validate_spp(p)
    assert len(errors) > 0
    assert "schema validation error" in errors[0]

def test_validate_nonexistent_file():
    errors = validate_spp("nonexistent.json")
    assert len(errors) == 1
    assert "manifest not found" in errors[0]

def test_validate_invalid_json(tmp_path):
    p = tmp_path / "invalid.json"
    p.write_text("not json")
    errors = validate_spp(p)
    assert len(errors) == 1
    assert "invalid json" in errors[0]
