import pytest
from pathlib import Path
from summit.assessment.policy import require_authorization, PolicyConfig, PolicyError
import json

def test_dry_run_always_allowed(tmp_path):
    # live=False should pass even if files don't exist
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "allowlist.json",
        attestation_path=tmp_path / "attestation.md"
    )
    require_authorization(cfg, live=False)

def test_live_requires_allowlist_existence(tmp_path):
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "nonexistent.json",
        attestation_path=tmp_path / "attestation.md"
    )
    # create attestation but not allowlist
    cfg.attestation_path.touch()

    with pytest.raises(PolicyError, match="Missing allowlist"):
        require_authorization(cfg, live=True)

def test_live_requires_attestation_existence(tmp_path):
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "allowlist.json",
        attestation_path=tmp_path / "nonexistent.md"
    )
    # create allowlist but not attestation
    cfg.allowlist_path.write_text(json.dumps({"targets": ["127.0.0.1"]}))

    with pytest.raises(PolicyError, match="Missing attestation"):
        require_authorization(cfg, live=True)

def test_live_requires_valid_json_allowlist(tmp_path):
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "allowlist.json",
        attestation_path=tmp_path / "attestation.md"
    )
    cfg.attestation_path.touch()
    cfg.allowlist_path.write_text("invalid json")

    with pytest.raises(PolicyError, match="Invalid JSON"):
        require_authorization(cfg, live=True)

def test_live_requires_targets_in_allowlist(tmp_path):
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "allowlist.json",
        attestation_path=tmp_path / "attestation.md"
    )
    cfg.attestation_path.touch()
    cfg.allowlist_path.write_text(json.dumps({"targets": []}))

    with pytest.raises(PolicyError, match="Allowlist has no targets"):
        require_authorization(cfg, live=True)

def test_live_succeeds_with_valid_config(tmp_path):
    cfg = PolicyConfig(
        allowlist_path=tmp_path / "allowlist.json",
        attestation_path=tmp_path / "attestation.md"
    )
    cfg.attestation_path.touch()
    cfg.allowlist_path.write_text(json.dumps({"targets": ["10.0.0.1"]}))

    require_authorization(cfg, live=True)
