import sys
import os
import json
import pytest
from unittest.mock import MagicMock, patch

# Add scripts directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../scripts'))

import evidence_validate

class TestEvidenceValidate:
    def test_check_timestamps_location(self):
        # Allow timestamps
        data = {"timestamp": "2026-01-01"}
        assert evidence_validate.check_timestamps_location(data, "stamp.json", True)

        # Deny timestamps
        assert not evidence_validate.check_timestamps_location(data, "report.json", False)

        # Nested check
        data_nested = {"data": {"ts": 123}}
        assert not evidence_validate.check_timestamps_location(data_nested, "metrics.json", False)

    def test_check_deterministic_formatting(self, tmp_path):
        # Create a deterministically formatted file
        good_file = tmp_path / "good.json"
        data = {"a": 1, "b": 2}
        with open(good_file, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)

        assert evidence_validate.check_deterministic_formatting(str(good_file))

        # Create a badly formatted file (indent=4)
        bad_file = tmp_path / "bad.json"
        with open(bad_file, "w") as f:
            json.dump(data, f, indent=4, sort_keys=True)

        assert not evidence_validate.check_deterministic_formatting(str(bad_file))

        # Create unsorted keys file
        unsorted_file = tmp_path / "unsorted.json"
        with open(unsorted_file, "w") as f:
            f.write('{\n  "b": 2,\n  "a": 1\n}')

        assert not evidence_validate.check_deterministic_formatting(str(unsorted_file))

    def test_integration_run_empty_valid(self, tmp_path):
        # Create dummy environment
        schemas_dir = tmp_path / "schema"
        schemas_dir.mkdir()

        # Write dummy schemas
        schema_content = json.dumps({"type": "object", "additionalProperties": True})
        (schemas_dir / "index.schema.json").write_text(schema_content)
        (schemas_dir / "report.schema.json").write_text(schema_content)
        (schemas_dir / "metrics.schema.json").write_text(schema_content)
        (schemas_dir / "stamp.schema.json").write_text(schema_content)

        # Write index
        index_file = tmp_path / "index.json"
        index_data = {
            "version": "1.0",
            "items": {}
        }
        with open(index_file, "w") as f:
            json.dump(index_data, f, indent=2, sort_keys=True)

        # Run main logic
        with patch.object(sys, 'argv', [
            'evidence_validate.py',
            '--schemas', str(schemas_dir),
            '--index', str(index_file),
            '--root', str(tmp_path)
        ]):
            try:
                evidence_validate.main()
            except SystemExit as e:
                if e.code is not None and e.code != 0:
                     pytest.fail(f"Script exited with {e.code}")

    def test_integration_fail_missing_file(self, tmp_path):
        schemas_dir = tmp_path / "schema"
        schemas_dir.mkdir()
        schema_content = json.dumps({"type": "object", "additionalProperties": True})
        (schemas_dir / "index.schema.json").write_text(schema_content)
        (schemas_dir / "report.schema.json").write_text(schema_content)
        (schemas_dir / "metrics.schema.json").write_text(schema_content)
        (schemas_dir / "stamp.schema.json").write_text(schema_content)

        index_file = tmp_path / "index.json"
        # Use KIMI ID to trigger strict missing file check
        index_data = {
            "items": {
                "EVD-KIMI-K25-TEST-001": {
                    "files": ["missing.json"]
                }
            }
        }
        with open(index_file, "w") as f:
            json.dump(index_data, f, indent=2, sort_keys=True)

        with patch.object(sys, 'argv', [
            'evidence_validate.py',
            '--schemas', str(schemas_dir),
            '--index', str(index_file),
            '--root', str(tmp_path)
        ]):
            with pytest.raises(SystemExit) as pytest_wrapped_e:
                evidence_validate.main()
            assert pytest_wrapped_e.type == SystemExit
            assert pytest_wrapped_e.value.code == 1

    def test_integration_fail_extra_property(self, tmp_path):
        schemas_dir = tmp_path / "schema"
        schemas_dir.mkdir()
        # strict schema
        schema_content = json.dumps({"type": "object", "additionalProperties": False})
        (schemas_dir / "index.schema.json").write_text(schema_content)
        (schemas_dir / "report.schema.json").write_text(schema_content)
        (schemas_dir / "metrics.schema.json").write_text(schema_content)
        (schemas_dir / "stamp.schema.json").write_text(schema_content)

        index_file = tmp_path / "index.json"
        # Item with extra property in report
        evd_id = "EVD-KIMI-K25-FAIL-001"
        evd_dir = tmp_path / evd_id
        evd_dir.mkdir()
        (evd_dir / "report.json").write_text('{"extra": 1}')
        (evd_dir / "metrics.json").write_text('{}')
        (evd_dir / "stamp.json").write_text('{}')

        index_data = {
            "items": {
                evd_id: {
                    "files": [f"{evd_dir}/report.json", f"{evd_dir}/metrics.json", f"{evd_dir}/stamp.json"]
                }
            }
        }
        with open(index_file, "w") as f:
            json.dump(index_data, f, indent=2, sort_keys=True)

        with patch.object(sys, 'argv', [
            'evidence_validate.py',
            '--schemas', str(schemas_dir),
            '--index', str(index_file),
            '--root', str(tmp_path),
            '--strict'
        ]):
            with pytest.raises(SystemExit) as pytest_wrapped_e:
                evidence_validate.main()
            assert pytest_wrapped_e.type == SystemExit
            assert pytest_wrapped_e.value.code == 1
