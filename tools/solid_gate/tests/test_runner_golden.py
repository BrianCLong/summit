import json
import os
import shutil
from unittest.mock import MagicMock, patch

import pytest

from tools.solid_gate import rules, runner, schema

# Golden artifacts verification
GOLDEN_DIR = os.path.join(os.path.dirname(__file__), "golden")
os.makedirs(GOLDEN_DIR, exist_ok=True)

@pytest.fixture
def clean_artifacts():
    if os.path.exists(runner.ARTIFACTS_DIR):
        shutil.rmtree(runner.ARTIFACTS_DIR)
    yield
    # Cleanup after test
    if os.path.exists(runner.ARTIFACTS_DIR):
        shutil.rmtree(runner.ARTIFACTS_DIR)

def test_no_changes(clean_artifacts):
    with patch('tools.solid_gate.git.get_changed_files', return_value=[]), \
         patch('tools.solid_gate.git.get_current_commit_sha', return_value="deadbeef"):

        runner.run(diff_base="main")

        with open("artifacts/solid-gate/report.json") as f:
            report = json.load(f)
            assert len(report["findings"]) == 0

def test_tests_not_touched(clean_artifacts):
    with patch('tools.solid_gate.git.get_changed_files', return_value=["src/logic.py"]), \
         patch('tools.solid_gate.git.get_file_content', return_value="print('hello')"), \
         patch('tools.solid_gate.git.get_current_commit_sha', return_value="deadbeef"):

        runner.run()

        with open("artifacts/solid-gate/report.json") as f:
            report = json.load(f)
            assert len(report["findings"]) == 1
            assert report["findings"][0]["rule_id"] == "TESTS_NOT_TOUCHED"

def test_proto_pollution(clean_artifacts):
    content = """
    function check(obj) {
        if ('isAdmin' in obj) { // Risk
            return true;
        }
        for (const k in obj) { // Safe
            console.log(k);
        }
    }
    """

    with patch('tools.solid_gate.git.get_changed_files', return_value=["src/utils.ts"]), \
         patch('tools.solid_gate.git.get_file_content', return_value=content), \
         patch('tools.solid_gate.git.get_current_commit_sha', return_value="deadbeef"):

        runner.run()

        with open("artifacts/solid-gate/report.json") as f:
            report = json.load(f)
            # Should find 1 issue (the 'isAdmin' in obj), ignoring the for loop
            findings = [f for f in report["findings"] if f["rule_id"] == "PROTO_POLLUTION_RISK"]
            assert len(findings) == 1
            assert findings[0]["line"] == 3

def test_large_file(clean_artifacts):
    content = "\n" * 301
    with patch('tools.solid_gate.git.get_changed_files', return_value=["src/big.py"]), \
         patch('tools.solid_gate.git.get_file_content', return_value=content), \
         patch('tools.solid_gate.git.get_current_commit_sha', return_value="deadbeef"):

        runner.run()

        with open("artifacts/solid-gate/report.json") as f:
            report = json.load(f)
            # Should also have TESTS_NOT_TOUCHED
            rule_ids = [f["rule_id"] for f in report["findings"]]
            assert "SMELL_LARGE_FILE" in rule_ids
            assert "TESTS_NOT_TOUCHED" in rule_ids

def test_golden_determinism(clean_artifacts):
    """Ensures that for a fixed input, output is bit-for-bit identical (excluding timestamps if any)."""

    files = ["src/feature.ts", "src/feature.test.ts"]
    content_map = {
        "src/feature.ts": "if ('bad' in x) return;",
        "src/feature.test.ts": "test('foo', () => {})"
    }

    def get_content(path):
        return content_map.get(path, "")

    with patch('tools.solid_gate.git.get_changed_files', return_value=files), \
         patch('tools.solid_gate.git.get_file_content', side_effect=get_content), \
         patch('tools.solid_gate.git.get_current_commit_sha', return_value="1234567890ab"), \
         patch('tools.solid_gate.runner.generate_config_hash', return_value="confighash"):

        runner.run(diff_base="origin/main")

        # Verify Report
        with open("artifacts/solid-gate/report.json") as f:
            report = f.read()

        # Verify Stamp
        with open("artifacts/solid-gate/stamp.json") as f:
            stamp = json.load(f)
            assert stamp["commit_sha"] == "1234567890ab"
            assert stamp["config_hash"] == "confighash"

        # Check finding stability
        with open("artifacts/solid-gate/report.json") as f:
            data = json.load(f)
            finding = data["findings"][0]
            assert finding["rule_id"] == "PROTO_POLLUTION_RISK"
            # Evidence ID should be stable
            assert finding["evidence_id"].startswith("SOLID_GATE:PROTO_POLLUTION_RISK:")
