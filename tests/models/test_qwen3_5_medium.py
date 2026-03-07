import unittest

from models.qwen.qwen3_5_medium import Qwen35MediumAdapter


class TestQwen35MediumAdapter(unittest.TestCase):
    def test_generate(self):
        adapter = Qwen35MediumAdapter()
        output = adapter.generate("Hello")
        self.assertIsNotNone(output.text)
        self.assertGreater(output.latency_ms, 0)
        self.assertEqual(output.metadata["model"], "qwen3.5-medium")

    def test_fibonacci(self):
        adapter = Qwen35MediumAdapter()
        output = adapter.generate("Write a fibonacci function")
        self.assertIn("def fibonacci", output.text)

if __name__ == '__main__':
    unittest.main()
