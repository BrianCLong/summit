import unittest
from summit.models.adapters.openai import OpenAIAdapter
from summit.models.adapters.anthropic import AnthropicAdapter

class TestModelAdapters(unittest.TestCase):
    def test_openai_contract(self):
        adapter = OpenAIAdapter()
        response = adapter.complete([{"role": "user", "content": "Hello"}])
        self.assertIn("content", response)
        self.assertIn("tool_calls", response)

    def test_anthropic_contract(self):
        adapter = AnthropicAdapter()
        response = adapter.complete([{"role": "user", "content": "Hello"}])
        self.assertIn("content", response)
        self.assertIn("tool_calls", response)

if __name__ == '__main__':
    unittest.main()
