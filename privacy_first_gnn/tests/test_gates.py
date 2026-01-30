import json
from pathlib import Path

import pytest

from privacy_first_gnn.gates.no_plaintext_sensitive import verify_no_plaintext_sensitive
from privacy_first_gnn.gates.no_server_secret_key import verify_no_server_secret_key


@pytest.fixture
def sensitive_fields():
    policy_path = Path(__file__).parent.parent / "policy" / "sensitive_fields.json"
    with open(policy_path) as f:
        return json.load(f)["sensitive_fields"]

def test_no_plaintext_sensitive_fail(sensitive_fields):
    fixture_path = Path(__file__).parent / "fixtures" / "plaintext_sensitive.fail.json"
    with open(fixture_path) as f:
        payload = json.load(f)

    success, msg = verify_no_plaintext_sensitive(payload, sensitive_fields)
    assert not success
    assert "Sensitive field 'src_ip' found in plaintext" in msg

def test_no_plaintext_sensitive_pass(sensitive_fields):
    payload = {
        "nodes": ["node-1"],
        "edges": [{"src": "node-1", "dst": "node-2", "bucket": 1}]
    }
    success, msg = verify_no_plaintext_sensitive(payload, sensitive_fields)
    assert success
    assert msg == "OK"

def test_no_server_secret_key_fail():
    fixture_dir = Path(__file__).parent / "fixtures"
    success, msg = verify_no_server_secret_key(fixture_dir)
    assert not success
    assert "Private key material found" in msg

def test_no_server_secret_key_pass(tmp_path):
    # Empty directory should pass
    success, msg = verify_no_server_secret_key(tmp_path)
    assert success
    assert msg == "OK"
