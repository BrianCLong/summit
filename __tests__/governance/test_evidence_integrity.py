import os
import shutil
import sys
import tempfile
import unittest

# Add the scripts directory to path so we can import (or we can just mock the files)
# Actually, it's easier to just run the script against a temp directory.
# But let's import the logic if possible.

sys.path.append(os.path.join(os.getcwd(), 'scripts/governance'))
from enforce_evidence_id_validity import extract_frontmatter


class TestEvidenceIntegrity(unittest.TestCase):
    def test_extract_frontmatter(self):
        content = """Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Header
Content here.
"""
        headers = extract_frontmatter(content)
        self.assertEqual(headers.get('Owner'), 'Governance')
        self.assertEqual(headers.get('Status'), 'active')
        self.assertEqual(headers.get('Evidence-IDs'), 'none')

    def test_extract_frontmatter_no_space(self):
        content = """Owner:Governance
Status:active
"""
        headers = extract_frontmatter(content)
        self.assertEqual(headers.get('Owner'), 'Governance')
        self.assertEqual(headers.get('Status'), 'active')

    def test_extract_frontmatter_stop_at_header(self):
        content = """Owner: Governance
Status: active
# My Header
Key: Value
"""
        headers = extract_frontmatter(content)
        self.assertEqual(headers.get('Owner'), 'Governance')
        self.assertEqual(headers.get('Status'), 'active')
        self.assertNotIn('Key', headers)

if __name__ == '__main__':
    unittest.main()
