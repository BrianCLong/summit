import json
import unittest
from unittest.mock import MagicMock, call, patch

from summit.cache.redis_client import RedisClient


class TestRedisClientExtended(unittest.TestCase):
    def setUp(self):
        # Reset singleton instance
        RedisClient._instances = {}

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_mget(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        client = RedisClient()

        # Setup mock return values
        mock_redis.mget.return_value = ['{"a": 1}', 'val2', None]

        keys = ["k1", "k2", "k3"]
        results = client.mget(keys)

        mock_redis.mget.assert_called_with(keys)
        self.assertEqual(results, [{"a": 1}, "val2", None])

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_mset(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        # Mock pipeline
        mock_pipeline = MagicMock()
        mock_redis.pipeline.return_value = mock_pipeline

        client = RedisClient()

        mapping = {"k1": {"a": 1}, "k2": "val2"}
        ttl = 60

        result = client.mset(mapping, ttl)

        self.assertTrue(result)
        mock_redis.pipeline.assert_called()

        # Verify calls on pipeline
        mock_pipeline.mset.assert_called_with({'k1': '{"a": 1}', 'k2': 'val2'})
        mock_pipeline.expire.assert_has_calls([call('k1', ttl), call('k2', ttl)], any_order=True)
        mock_pipeline.execute.assert_called()

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_pipeline(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        client = RedisClient()

        pipe = client.pipeline()
        mock_redis.pipeline.assert_called()
        self.assertEqual(pipe, mock_redis.pipeline.return_value)

    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', False)
    def test_pipeline_disabled(self):
        client = RedisClient()
        pipe = client.pipeline()
        # Should return a dummy object that supports context manager and methods
        with pipe as p:
            p.set("foo", "bar")
            res = p.execute()
            self.assertEqual(res, [None])

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_scan_iter(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        client = RedisClient()

        mock_redis.scan_iter.return_value = iter(["k1", "k2"])

        result = list(client.scan_iter(match="k*", count=100))

        mock_redis.scan_iter.assert_called_with(match="k*", count=100)
        self.assertEqual(result, ["k1", "k2"])

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_ttl(self, mock_from_url):
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        client = RedisClient()

        mock_redis.ttl.return_value = 100
        val = client.ttl("k1")
        mock_redis.ttl.assert_called_with("k1")
        self.assertEqual(val, 100)

if __name__ == '__main__':
    unittest.main()
