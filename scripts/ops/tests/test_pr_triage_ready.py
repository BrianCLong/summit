import subprocess
import os
import json
import unittest

class TestPRTriageReady(unittest.TestCase):
    def setUp(self):
        self.worklist_dir = os.path.join(os.getcwd(), 'ops/comet_v2')
        self.worklist_path = os.path.join(self.worklist_dir, 'worklist.json')
        os.makedirs(self.worklist_dir, exist_ok=True)

        self.original_worklist_content = None
        if os.path.exists(self.worklist_path):
            with open(self.worklist_path, 'r') as f:
                self.original_worklist_content = f.read()

        mock_worklist = [
            {"description": "Task 1", "score": 2, "status_text": "Ready for Review", "pr_number": 101},
            {"description": "Task 2", "score": 1, "status_text": "Ready for Implementation", "pr_number": 999}
        ]
        with open(self.worklist_path, 'w') as f:
            json.dump(mock_worklist, f)

        # Patch pr_triage.ts mock data
        self.script_path = os.path.join(os.getcwd(), 'scripts/ops/pr_triage.ts')
        with open(self.script_path, 'r') as f:
            self.original_script_content = f.read()

        new_content = self.original_script_content.replace(
            "labels: [{ name: 'feature' }]",
            "labels: [{ name: 'feature' }, { name: 'comet_v2_triage' }]"
        ).replace(
            "labels: [{ name: 'security' }]",
            "labels: [{ name: 'security' }, { name: 'websocket_metrics' }, { name: 'metrics-failed' }]"
        )
        with open(self.script_path, 'w') as f:
            f.write(new_content)

    def tearDown(self):
        if self.original_worklist_content:
            with open(self.worklist_path, 'w') as f:
                f.write(self.original_worklist_content)
        elif os.path.exists(self.worklist_path):
            pass # Keep it simple

        # Restore script
        if hasattr(self, 'original_script_content'):
            with open(self.script_path, 'w') as f:
                f.write(self.original_script_content)

    def test_ready_queue_output(self):
        repo_root = os.getcwd()
        cmd = ["npx", "tsx", "scripts/ops/pr_triage.ts", "--ready"]

        result = subprocess.run(cmd, cwd=repo_root, capture_output=True, text=True)

        # print("STDOUT:", result.stdout)
        # print("STDERR:", result.stderr)

        self.assertEqual(result.returncode, 0)
        self.assertIn("Generating Agentic Triage Ready Queue...", result.stdout)
        self.assertIn("## 🚀 Ready Queue", result.stdout)

        self.assertIn("| #102 fix: security policy bypass | WebSocket | 🔴 Metrics Failed", result.stdout)
        self.assertIn("| #101 feat: add new ingestion pipeline | Comet v2 | Score 2 (Ready for Review)", result.stdout)

        lines = result.stdout.splitlines()
        idx_102 = -1
        idx_101 = -1
        for i, line in enumerate(lines):
            if "| #102" in line: idx_102 = i
            if "| #101" in line: idx_101 = i

        self.assertNotEqual(idx_102, -1)
        self.assertNotEqual(idx_101, -1)
        self.assertLess(idx_102, idx_101)

if __name__ == '__main__':
    unittest.main()
