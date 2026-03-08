
import os
import shutil
import tempfile
import time
import unittest
from unittest.mock import MagicMock

from summit.scouts.base import Config
from summit.scouts.test_sampler import TestSamplerScout, find_test_files, is_safe_test_file


class TestTestSampler(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.scout = TestSamplerScout()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def create_file(self, path, content):
        full_path = os.path.join(self.test_dir, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)
        return full_path

    def test_is_safe_test_file(self):
        # Safe file
        safe_path = self.create_file("test_safe.py", """
import pytest
def test_ok():
    pass
""")
        self.assertTrue(is_safe_test_file(safe_path))

        # Unsafe directory
        unsafe_dir_path = self.create_file("integration/test_unsafe.py", """
def test_bad():
    pass
""")
        self.assertFalse(is_safe_test_file(unsafe_dir_path))

        # Unsafe marker (Attribute)
        unsafe_marker_path = self.create_file("test_marker.py", """
import pytest
@pytest.mark.e2e
def test_bad():
    pass
""")
        self.assertFalse(is_safe_test_file(unsafe_marker_path))

        # Unsafe marker (Call)
        unsafe_call_path = self.create_file("test_call.py", """
import pytest
@pytest.mark.slow()
def test_bad():
    pass
""")
        self.assertFalse(is_safe_test_file(unsafe_call_path))

        # Unsafe marker (Name)
        unsafe_name_path = self.create_file("test_name.py", """
@slow
def test_bad():
    pass
""")
        self.assertFalse(is_safe_test_file(unsafe_name_path))

    def test_find_test_files(self):
        self.create_file("test_1.py", "def test_1(): pass")
        self.create_file("subdir/test_2.py", "def test_2(): pass")
        self.create_file("integration/test_3.py", "def test_3(): pass")
        self.create_file("test_4.py", "@pytest.mark.e2e\ndef test_4(): pass")

        found = find_test_files(self.test_dir, 1000)
        found_names = [os.path.relpath(p, self.test_dir) for p in found]

        self.assertIn("test_1.py", found_names)
        self.assertIn("subdir/test_2.py", found_names)
        self.assertNotIn("integration/test_3.py", found_names)
        self.assertNotIn("test_4.py", found_names)

    def test_run_scout(self):
        self.create_file("test_run.py", "def test_run(): pass")

        ctx = MagicMock()
        ctx.path = self.test_dir
        cfg = Config(max_cost_ms=2000)

        result = self.scout.run(ctx, cfg)

        self.assertEqual(len(result.artifacts), 1)
        self.assertTrue(result.artifacts[0].endswith("test_run.py"))
        self.assertTrue(result.cost_ms >= 0)

    def test_run_scout_timeout(self):
        # Create many files to ensure it takes some time, though hard to test timeout precisely without mocking time
        # We'll just verify it returns a result
        for i in range(10):
            self.create_file(f"test_{i}.py", "def test(): pass")

        ctx = MagicMock()
        ctx.path = self.test_dir
        cfg = Config(max_cost_ms=1) # Very short timeout

        # It might return partial results or empty
        result = self.scout.run(ctx, cfg)
        # We can't guarantee it stopped early unless we mock time, but we check no crash
        self.assertIsInstance(result.artifacts, list)

if __name__ == '__main__':
    unittest.main()
