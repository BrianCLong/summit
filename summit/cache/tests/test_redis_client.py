import json
import unittest
import os
from unittest.mock import MagicMock, patch

from summit.cache.redis_client import RedisClient


class TestRedisClient(unittest.TestCase):
    def setUp(self):
        # Reset singleton instances
        RedisClient._instances = {}

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_init(self, mock_from_url):
        client = RedisClient()
        self.assertTrue(client.enabled)
        mock_from_url.assert_called_once()
        self.assertEqual(client.partition, "default")

    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', False)
    def test_init_disabled(self):
        client = RedisClient()
        self.assertFalse(client.enabled)

    @patch.dict(os.environ, {
        "REDIS_CACHE_HOST": "cache-host",
        "REDIS_CACHE_PORT": "6380",
        "REDIS_CACHE_USE_CLUSTER": "false"
    })
    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_partitioning(self, mock_from_url):
        client = RedisClient(partition="cache")
        self.assertTrue(client.enabled)
        self.assertEqual(client.partition, "cache")
        # Ensure from_url gets the constructed URL from environment
        mock_from_url.assert_called_once()
        args, _ = mock_from_url.call_args
        self.assertTrue("redis://cache-host:6380" in args[0])

    @patch.dict(os.environ, {
        "REDIS_DIST_USE_CLUSTER": "true",
        "REDIS_DIST_CLUSTER_NODES": "node1:6379,node2:6379"
    })
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_cluster_mode(self):
        # Since we might or might not have redis.cluster installed in test env (we do here),
        # patch the RedisCluster instantiation
        with patch('summit.cache.redis_client.RedisCluster') as mock_cluster:
            # Re-import to avoid stale references if mock isn't caught
            from summit.cache.redis_client import RedisClient

            client = RedisClient(partition="dist")
            self.assertTrue(client.enabled)
            self.assertEqual(client.partition, "dist")

            mock_cluster.assert_called_once()
            _, kwargs = mock_cluster.call_args
            self.assertTrue('startup_nodes' in kwargs)
            self.assertEqual(len(kwargs['startup_nodes']), 2)

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_set_get(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis

        client = RedisClient()

        # Test Set
        client.set("test_key", {"a": 1})
        mock_redis.set.assert_called_with("test_key", '{"a": 1}', ex=3600)

        # Test Get
        mock_redis.get.return_value = '{"a": 1}'
        val = client.get("test_key")
        self.assertEqual(val, {"a": 1})

if __name__ == '__main__':
    unittest.main()
