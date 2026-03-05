import os
import sys
import unittest

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from media_list.extract import extract_claims
from media_list.ingest import parse_input


class TestMediaListIngest(unittest.TestCase):
    def setUp(self):
        os.environ["MEDIA_AI_LIST_ENABLED"] = "true"

    def test_parse_input(self):
        result = parse_input("http://example.com/ai-tools")
        self.assertTrue(len(result) > 0)

    def test_extract_claims(self):
        parsed = [{"raw_item": "ToolA", "type": "tool_list"}, {"raw_item": "Fast", "type": "claim"}]
        extracted = extract_claims(parsed)
        self.assertIn("tools", extracted)
        self.assertIn("claims", extracted)
        self.assertEqual(len(extracted["tools"]), 1)
        self.assertEqual(len(extracted["claims"]), 1)

if __name__ == "__main__":
    unittest.main()
