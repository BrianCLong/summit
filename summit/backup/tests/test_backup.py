import base64
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, call, patch

from summit.backup.manager import BackupManager
from summit.backup.redis_provider import RedisBackupProvider


class TestRedisBackupProvider(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.mock_client = MagicMock()
        self.mock_client.enabled = True
        self.provider = RedisBackupProvider(self.mock_client)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)

    def test_backup(self):
        # Mock scan_iter
        self.mock_client.scan_iter.return_value = ["key1", "key2"]

        # Mock dump and pttl
        self.mock_client.client.dump.side_effect = [b"dump1", b"dump2"]
        self.mock_client.client.pttl.side_effect = [1000, -1] # 1000ms, persistent

        result = self.provider.backup(self.tmp_dir)

        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["file"]))
        self.assertEqual(result["count"], 2)

        # Verify file content
        with open(result["file"]) as f:
            lines = f.readlines()
            r1 = json.loads(lines[0])
            self.assertEqual(r1["k"], "key1")
            self.assertEqual(r1["t"], 1000)
            self.assertEqual(base64.b64decode(r1["v"]), b"dump1")

            r2 = json.loads(lines[1])
            self.assertEqual(r2["k"], "key2")
            self.assertEqual(r2["t"], 0) # -1 -> 0
            self.assertEqual(base64.b64decode(r2["v"]), b"dump2")

    def test_restore(self):
        # Create a backup file
        backup_file = os.path.join(self.tmp_dir, "backup.jsonl")
        with open(backup_file, 'w') as f:
            r1 = {"k": "key1", "v": base64.b64encode(b"dump1").decode('utf-8'), "t": 1000}
            r2 = {"k": "key2", "v": base64.b64encode(b"dump2").decode('utf-8'), "t": 0}
            f.write(json.dumps(r1) + "\n")
            f.write(json.dumps(r2) + "\n")

        mock_pipeline = MagicMock()
        self.mock_client.pipeline.return_value = mock_pipeline

        # Use a fresh provider instance for restore test to avoid shared state issues if any
        # though mock_client is shared in setUp, pipeline is mocked per call/test
        # We need to make sure self.provider.client is our mock
        self.provider.client = self.mock_client

        result = self.provider.restore(backup_file)

        self.assertTrue(result)
        # Check calls on the mock pipeline returned by client.pipeline()
        # Note: self.mock_client.pipeline() returns mock_pipeline
        self.assertEqual(mock_pipeline.restore.call_count, 2)

        # We can't easily use assert_any_call because arguments are specific
        # But we can iterate call_args_list
        calls = mock_pipeline.restore.call_args_list
        # calls[0] should be key1, calls[1] key2
        self.assertEqual(calls[0][0][0], "key1")
        self.assertEqual(calls[0][0][1], 1000)
        self.assertEqual(calls[0][0][2], b"dump1")

        self.assertEqual(calls[1][0][0], "key2")
        self.assertEqual(calls[1][0][1], 0)
        self.assertEqual(calls[1][0][2], b"dump2")

        mock_pipeline.execute.assert_called()

class TestBackupManager(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.manager = BackupManager(self.tmp_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)

    def test_register_and_execute(self):
        mock_provider = MagicMock()
        mock_provider.backup.return_value = {"status": "success"}

        self.manager.register_provider("mock", mock_provider)

        result = self.manager.execute_backup("mock")

        mock_provider.backup.assert_called_with(self.tmp_dir)
        self.assertEqual(result, {"status": "success"})

    @patch('summit.backup.manager.RedisClient')
    def test_default_redis_provider(self, MockRedisClient):
        # Redis provider should be registered by default
        self.assertIn("redis", self.manager.providers)
        self.assertIsInstance(self.manager.providers["redis"], RedisBackupProvider)

if __name__ == '__main__':
    unittest.main()
