import hashlib
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock

from summit.scouts.base import Config
from summit.scouts.repo_map import RepoMapScout


class TestRepoMapScout(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.scout = RepoMapScout()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def create_file(self, path, content):
        full_path = os.path.join(self.test_dir, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            if isinstance(content, str):
                f.write(content.encode('utf-8'))
            else:
                f.write(content)
        return full_path

    def test_run_scout(self):
        self.create_file("file_a.txt", "content a")
        self.create_file("subdir/file_b.txt", "content b")
        self.create_file(".hidden/file_c.txt", "hidden")
        self.create_file("node_modules/file_d.txt", "node")
        self.create_file("file_c.txt", "content c")
        self.create_file(".file_d.txt", "hidden file")

        ctx = MagicMock()
        ctx.path = self.test_dir
        cfg = Config(max_cost_ms=2000)

        # We can just call _run which we routed to run to bypass telemetry for tests
        result = self.scout._run(ctx, cfg)

        self.assertTrue(len(result.artifacts) == 3)

        # Check determinism and formats
        self.assertTrue(result.artifacts[0].endswith("file_a.txt"))
        self.assertTrue(result.artifacts[1].endswith("file_c.txt"))
        self.assertTrue(result.artifacts[2].endswith("subdir/file_b.txt"))

        # Verify hash
        hash_a = hashlib.sha256(b"content a").hexdigest()
        self.assertTrue(result.artifacts[0].startswith(hash_a))

if __name__ == '__main__':
    unittest.main()
