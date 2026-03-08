import os
import sys
import unittest

# Ensure repo root is in path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
sys.path.append(REPO_ROOT)

from summit.features.osint_watch import engine


class TestOsintWatchEngine(unittest.TestCase):
    def test_parse_markdown(self):
        content = """
## Section One
Content for section one.
* Item 1
* Item 2

## Section Two 🚀
Content for section two.
"""
        result = engine.parse_markdown(content)
        # Check emoji removal
        self.assertIn("Section Two", result["sections"])
        self.assertIn("Section One", result["sections"])
        self.assertIn("Content for section one.", result["sections"]["Section One"])

if __name__ == "__main__":
    unittest.main()
