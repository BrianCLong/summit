import json
import os
import subprocess
import tempfile
import unittest


class TestRCP(unittest.TestCase):
    def setUp(self):
        self.script = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'bin', 'rcp'))
        os.chmod(self.script, 0o755)

    def test_evaluate_pr(self):
        with tempfile.TemporaryDirectory() as tempdir:
            out_file = os.path.join(tempdir, 'out.json')
            subprocess.run([self.script, 'evaluate-pr', '--pr', '1', '--sha', 'abcdef12', '--out', out_file], check=True)
            with open(out_file) as f:
                data = json.load(f)
            self.assertIn('merge_eligible', data)
            self.assertIn('trust_score', data)
            self.assertIn('violations', data)

    def test_decide_promotion(self):
        with tempfile.TemporaryDirectory() as tempdir:
            out_file = os.path.join(tempdir, 'out.json')
            subprocess.run([self.script, 'decide-promotion', '--env-from', 'dev', '--env-to', 'staging', '--run-id', 'test1', '--trust-score', '90', '--out', out_file], check=True)
            with open(out_file) as f:
                data = json.load(f)
            self.assertTrue(data['promotion_eligible'])

    def test_ledger_append(self):
        with tempfile.TemporaryDirectory() as tempdir:
            entry_file = os.path.join(tempdir, 'entry.json')
            ledger_file = os.path.join(tempdir, 'ledger.jsonl')
            with open(entry_file, 'w') as f:
                json.dump({"timestamp": "2024-05-01T12:00:00Z", "action": "merge", "run_id": "test1", "trust_score": 90}, f)
            subprocess.run([self.script, 'ledger', 'append', '--entry', entry_file, '--ledger', ledger_file], check=True)

            with open(ledger_file) as f:
                lines = f.readlines()
            self.assertEqual(len(lines), 1)

if __name__ == '__main__':
    unittest.main()
