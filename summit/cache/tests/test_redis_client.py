import unittest
from unittest.mock import MagicMock, patch
import json
from summit.cache.redis_client import RedisClient

class TestRedisClient(unittest.TestCase):
    def setUp(self):
        # Reset singleton instance
        RedisClient._instance = None

    @patch('summit.cache.redis_client.redis.Redis.from_url')
    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', True)
    def test_init(self, mock_from_url):
        client = RedisClient()
        self.assertTrue(client.enabled)
        mock_from_url.assert_called_once()

    @patch('summit.cache.redis_client.REDIS_CACHE_ENABLED', False)
    def test_init_disabled(self):
        client = RedisClient()
        self.assertFalse(client.enabled)

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
