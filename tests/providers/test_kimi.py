import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from summit.providers.moonshot import MoonshotProvider
from summit.providers.together import TogetherProvider


class TestKimiProviders(unittest.IsolatedAsyncioTestCase):
    async def test_moonshot_init(self):
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "test"}):
            p = MoonshotProvider()
            self.assertEqual(p.api_key, "test")

    async def test_moonshot_chat(self):
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "test"}):
            p = MoonshotProvider()
            mock_response = MagicMock()
            mock_response.json.return_value = {"choices": [{"message": {"content": "Hello"}}]}
            mock_response.raise_for_status = MagicMock()

            with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
                mock_post.return_value = mock_response
                res = await p.chat_completion([{"role": "user", "content": "Hi"}])
                self.assertEqual(res["choices"][0]["message"]["content"], "Hello")
                mock_post.assert_called_once()

    async def test_moonshot_multimodal(self):
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "test"}):
            p = MoonshotProvider()
            mock_response = MagicMock()
            mock_response.json.return_value = {"choices": []}
            mock_response.raise_for_status = MagicMock()

            with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
                mock_post.return_value = mock_response
                messages = [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this"},
                        {"type": "image_url", "image_url": {"url": "http://img.png"}}
                    ]
                }]
                await p.chat_completion(messages)
                args, kwargs = mock_post.call_args
                self.assertEqual(kwargs["json"]["messages"], messages)

    async def test_together_flag_disabled(self):
        with patch.dict(os.environ, {}, clear=True):
             with self.assertRaisesRegex(RuntimeError, "Together provider is currently disabled"):
                 TogetherProvider()

    async def test_together_flag_enabled(self):
        with patch.dict(os.environ, {"FEATURE_TOGETHER_KIMI": "1", "TOGETHER_API_KEY": "test"}):
            p = TogetherProvider()
            self.assertEqual(p.api_key, "test")

if __name__ == "__main__":
    unittest.main()
