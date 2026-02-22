import pytest
import os
from unittest.mock import patch, MagicMock
from summit.scouts.test_sampler import TestSamplerScout, is_safe_test_file, find_test_files, Config

def test_is_safe_test_file(tmp_path):
    # Safe file
    f1 = tmp_path / "test_safe.py"
    f1.write_text("def test_one(): pass")
    assert is_safe_test_file(str(f1)) is True

    # Unsafe directory
    d1 = tmp_path / "integration"
    d1.mkdir()
    f2 = d1 / "test_unsafe_dir.py"
    f2.write_text("def test_two(): pass")
    assert is_safe_test_file(str(f2)) is False

    # Unsafe marker @slow
    f3 = tmp_path / "test_marker.py"
    f3.write_text("@slow\ndef test_three(): pass")
    # Need to check if ast handles this.
    # Usually ast.parse works fine.

    assert is_safe_test_file(str(f3)) is False

def test_find_test_files(tmp_path):
    f_a = tmp_path / "test_a.py"
    f_a.write_text("def test_a(): pass")

    # Unsafe because of content @integration
    f_b = tmp_path / "test_b.py"
    f_b.write_text("@integration\ndef test_b(): pass")

    files = find_test_files(str(tmp_path), 1000)
    # test_b should be excluded because it's unsafe
    # Wait, check is_safe_test_file logic for @integration
    # Yes, 'integration' is in unsafe_markers

    # We expect test_a.py to be found.
    # test_b.py should NOT be found.
    # Note: find_test_files returns list of strings.

    filenames = [os.path.basename(f) for f in files]
    assert "test_a.py" in filenames
    assert "test_b.py" not in filenames

def test_scout_run():
    scout = TestSamplerScout()
    cfg = Config(max_cost_ms=1000)

    # Mock find_test_files to return something
    with patch("summit.scouts.test_sampler.find_test_files", return_value=["test_1.py"]) as mock_find:
        result = scout.run({"path": "."}, cfg)
        assert result.artifacts == ["test_1.py"]
        mock_find.assert_called()

def test_scout_run_with_ctx_path():
    scout = TestSamplerScout()
    cfg = Config(max_cost_ms=1000)

    # Context as object with path attribute
    class Ctx:
        path = "some/path"

    with patch("summit.scouts.test_sampler.find_test_files", return_value=[]) as mock_find, \
         patch("os.path.exists", return_value=True):
        scout.run(Ctx(), cfg)
        mock_find.assert_called_with("some/path", 1000)
