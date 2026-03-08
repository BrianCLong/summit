import unittest
import tempfile
import shutil
import os
import json
from denylist_openai_assistants import scan_directory, DENYLIST_PATTERNS

class TestDenylistScanner(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def create_file(self, filename, content):
        path = os.path.join(self.test_dir, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(content)
        return path

    def test_scan_finds_patterns(self):
        self.create_file("clean.ts", "const a = 1;")
        self.create_file("violation.ts", "const client = new OpenAI();\nclient.beta.assistants.create();")
        self.create_file("api_call.py", "requests.post('https://api.openai.com/v1/assistants')")
        # Matches raw header string
        self.create_file("headers.txt", "OpenAI-Beta: assistants=v1")

        results = scan_directory(self.test_dir, set(), DENYLIST_PATTERNS)

        # We expect 3 files to match
        self.assertEqual(len(results), 3)

        files = {r['file'] for r in results}
        self.assertTrue(any("violation.ts" in f for f in files))
        self.assertTrue(any("api_call.py" in f for f in files))
        self.assertTrue(any("headers.txt" in f for f in files))

    def test_scan_excludes(self):
        os.makedirs(os.path.join(self.test_dir, "node_modules"))
        self.create_file("node_modules/lib.js", "beta.assistants.create()")

        results = scan_directory(self.test_dir, {"node_modules"}, DENYLIST_PATTERNS)
        self.assertEqual(len(results), 0)

if __name__ == '__main__':
    unittest.main()
