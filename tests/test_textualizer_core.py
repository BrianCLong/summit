import json
import tempfile
import os
import shutil
from summit.textualizer.core import to_context_pack

def test_to_context_pack_success():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create dummy trajectory files
        # Using [3, 1, 2] to verify order is preserved
        t1 = {
            "trajectory_id": "t1",
            "timestamp": "2023-01-01T12:00:00Z",
            "data": [3, 1, 2],
            "secret": "my_secret_1",
            "custom_sensitive": "hide_me"
        }

        p1 = os.path.join(tmpdir, "t1.json")

        with open(p1, "w") as f:
            json.dump(t1, f)

        # Create a manifest.json
        manifest = {
            "never_log_fields": ["custom_sensitive"]
        }
        with open(os.path.join(tmpdir, "manifest.json"), "w") as f:
            json.dump(manifest, f)

        # Call the function
        result_bytes = to_context_pack([p1])

        # Parse result
        result = json.loads(result_bytes)

        trajectories = result.get("trajectories", [])
        t1_out = trajectories[0]

        # Check list order preserved
        assert t1_out["data"] == [3, 1, 2], "List order should be preserved (not sorted)"

        # Check timestamp removal
        assert "timestamp" not in t1_out, "timestamp should be removed"

        # Check default redaction
        assert t1_out["secret"] == "[REDACTED]", "secret should be redacted by default"

        # Check manifest redaction
        assert t1_out["custom_sensitive"] == "[REDACTED]", "custom_sensitive should be redacted per manifest"

def test_to_context_pack_bad_manifest():
    with tempfile.TemporaryDirectory() as tmpdir:
        p1 = os.path.join(tmpdir, "t1.json")
        with open(p1, "w") as f:
            json.dump({"id": "1"}, f)

        # Create invalid manifest
        with open(os.path.join(tmpdir, "manifest.json"), "w") as f:
            f.write("INVALID JSON {")

        # Verify it raises ValueError
        try:
            to_context_pack([p1])
            assert False, "Should have raised ValueError for bad manifest"
        except ValueError as e:
            assert "Failed to parse manifest" in str(e)
