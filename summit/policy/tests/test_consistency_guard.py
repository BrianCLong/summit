import os
import unittest

from summit.policy.guards.consistency_guard import ConsistencyGuard


def parse_transcript(filepath):
    transcript = []
    with open(filepath) as f:
        for line in f:
            if line.startswith("User: "):
                transcript.append({"role": "user", "content": line[6:].strip()})
            elif line.startswith("Assistant: "):
                transcript.append({"role": "assistant", "content": line[11:].strip()})
    return transcript

class TestConsistencyGuard(unittest.TestCase):
    def setUp(self):
        self.guard = ConsistencyGuard()
        self.fixtures_dir = os.path.join(os.path.dirname(__file__), "../fixtures")

    def test_normal_dialog(self):
        transcript = parse_transcript(os.path.join(self.fixtures_dir, "normal_dialog.txt"))
        self.assertTrue(self.guard.check(transcript), "Normal dialog should pass")

    def test_inconsistency_dialog(self):
        transcript = parse_transcript(os.path.join(self.fixtures_dir, "long_dialog_inconsistency.txt"))
        self.assertFalse(self.guard.check(transcript), "Inconsistent dialog should fail")

if __name__ == "__main__":
    unittest.main()
