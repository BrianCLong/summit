import json
import sys
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure module import path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".ci" / "scripts"))

from sbom import diff_budget  # noqa: E402


class DiffBudgetTests(unittest.TestCase):
    def test_extract_vulnerabilities_from_grype(self):
        data = {
            "matches": [
                {"vulnerability": {"id": "CVE-1", "severity": "High"}},
                {"vulnerability": {"id": "CVE-2", "severity": "Low"}},
            ]
        }
        vulns = diff_budget.extract_vulnerabilities(data)
        counts = diff_budget.count_by_severity(vulns)
        self.assertEqual(counts["high"], 1)
        self.assertEqual(counts["low"], 1)

    def test_filter_exceptions_with_expiry_and_approvals(self):
        now = datetime.now(UTC)
        valid_expiry = (now + timedelta(days=2)).isoformat()
        expired = (now - timedelta(days=1)).isoformat()
        with tempfile.TemporaryDirectory() as tmpdir:
            exc_dir = Path(tmpdir)
            exc_file = exc_dir / "abc123.json"
            exc_file.write_text(
                json.dumps(
                    {
                        "signed": True,
                        "exceptions": [
                            {
                                "vulnId": "CVE-OK",
                                "justification": "dependency pinned",
                                "ticket": "https://tracker/123",
                                "expiry": valid_expiry,
                                "approvals": {"security": "alice", "platform": "bob"},
                            },
                            {
                                "vulnId": "CVE-OLD",
                                "justification": "legacy",
                                "ticket": "https://tracker/999",
                                "expiry": expired,
                                "approvals": {"security": "alice", "platform": "bob"},
                            },
                        ],
                    }
                )
            )
            accepted, alerts = diff_budget.load_exceptions(exc_dir, "abc123", alert_window_days=3)
        self.assertIn("CVE-OK", accepted)
        self.assertNotIn("CVE-OLD", accepted)
        self.assertTrue(any("expired" in a for a in alerts))

    def test_budget_enforcement_blocks_new_critical(self):
        deltas = {"critical": 1, "high": 0, "medium": 0, "low": 0, "unknown": 0}
        ok, errors = diff_budget.evaluate(deltas, diff_budget.DEFAULT_BUDGET)
        self.assertFalse(ok)
        self.assertTrue(any("critical" in e.lower() for e in errors))


if __name__ == "__main__":
    unittest.main()
