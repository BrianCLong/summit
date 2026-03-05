import unittest
import sys
import os

# Add parent directory to path to import script
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from generate_worklist import parse_issue

class TestGenerateWorklist(unittest.TestCase):
    def test_parse_simple_list(self):
        content = """
- [ ] Task 1
- [x] Task 2
"""
        worklist = parse_issue(content)
        self.assertEqual(len(worklist), 2)
        self.assertEqual(worklist[0]['score'], 1)
        self.assertEqual(worklist[1]['score'], 3)

    def test_parse_blocked(self):
        content = """
- [ ] Task 1 (Blocked)
- [ ] Task 2
  - Status: Blocked by X
"""
        worklist = parse_issue(content)
        self.assertEqual(worklist[0]['score'], 0)
        self.assertEqual(worklist[1]['score'], 0)

    def test_parse_pr_ready(self):
        content = """
- [ ] Task 1
  - PR #123 is open.
- [ ] Task 2 (PR open)
"""
        worklist = parse_issue(content)
        self.assertEqual(worklist[0]['score'], 2)
        self.assertEqual(worklist[1]['score'], 2)

if __name__ == '__main__':
    unittest.main()
