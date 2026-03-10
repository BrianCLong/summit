import base64
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, call, patch

from summit.backup.manager import BackupManager
from summit.backup.redis_provider import RedisBackupProvider

class MockRedisCluster:
    pass

class TestRedisBackupProvider(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.mock_client = MagicMock()
        self.mock_client.enabled = True
        self.mock_client.partition = "default"

        # We also need to set RedisCluster available in provider if tested
        import summit.backup.redis_provider as redis_provider
        self._orig_RedisCluster = redis_provider.RedisCluster
        redis_provider.RedisCluster = MockRedisCluster

        self.provider = RedisBackupProvider(self.mock_client)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir)
        import summit.backup.redis_provider as redis_provider
        redis_provider.RedisCluster = self._orig_RedisCluster

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
        self.assertEqual(result["partition"], "default")

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

    def test_restore_single(self):
        # Create a backup file
        backup_file = os.path.join(self.tmp_dir, "backup.jsonl")
        with open(backup_file, 'w') as f:
            r1 = {"k": "key1", "v": base64.b64encode(b"dump1").decode('utf-8'), "t": 1000}
            r2 = {"k": "key2", "v": base64.b64encode(b"dump2").decode('utf-8'), "t": 0}
            f.write(json.dumps(r1) + "\n")
            f.write(json.dumps(r2) + "\n")

        mock_pipeline = MagicMock()
        self.mock_client.pipeline.return_value = mock_pipeline
        # Ensure it's not detected as cluster
        self.mock_client.client = MagicMock()

        self.provider.client = self.mock_client

        result = self.provider.restore(backup_file)

        self.assertTrue(result)
        self.assertEqual(mock_pipeline.restore.call_count, 2)

        calls = mock_pipeline.restore.call_args_list
        self.assertEqual(calls[0][0][0], "key1")
        self.assertEqual(calls[0][0][1], 1000)
        self.assertEqual(calls[0][0][2], b"dump1")

        self.assertEqual(calls[1][0][0], "key2")
        self.assertEqual(calls[1][0][1], 0)
        self.assertEqual(calls[1][0][2], b"dump2")

        mock_pipeline.execute.assert_called()

    def test_restore_cluster(self):
        # Cluster mode should NOT use pipeline
        backup_file = os.path.join(self.tmp_dir, "backup_cluster.jsonl")
        with open(backup_file, 'w') as f:
            r1 = {"k": "key1", "v": base64.b64encode(b"dump1").decode('utf-8'), "t": 1000}
            f.write(json.dumps(r1) + "\n")

        # Mock the client so isinstance(self.client.client, RedisCluster) is True
        mock_client_inner = MagicMock()
        mock_client_inner.__class__ = MockRedisCluster
        self.mock_client.client = mock_client_inner

        self.provider.client = self.mock_client
        result = self.provider.restore(backup_file)

        self.assertTrue(result)
        # Verify direct restore call (no pipeline)
        self.assertEqual(mock_client_inner.restore.call_count, 1)
        calls = mock_client_inner.restore.call_args_list
        self.assertEqual(calls[0][0][0], "key1")


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

    def test_execute_all_backups(self):
        mock_provider_1 = MagicMock()
        mock_provider_1.backup.return_value = {"status": "success", "partition": "default"}
        mock_provider_2 = MagicMock()
        mock_provider_2.backup.return_value = {"status": "success", "partition": "cache"}

        # Clear default registered providers for simplicity
        self.manager.providers = {}
        self.manager.register_provider("default", mock_provider_1)
        self.manager.register_provider("cache", mock_provider_2)

        results = self.manager.execute_all_backups()
        self.assertEqual(len(results), 2)
        self.assertEqual(results["default"]["status"], "success")

    @patch('summit.backup.manager.RedisClient')
    def test_default_redis_providers(self, MockRedisClient):
        # We register 3 by default
        self.assertIn("redis", self.manager.providers)
        self.assertIn("redis_cache", self.manager.providers)
        self.assertIn("redis_dist", self.manager.providers)

if __name__ == '__main__':
    unittest.main()
