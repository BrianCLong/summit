import json
import os
import tempfile
import unittest
from pathlib import Path

from scripts.evidence.generate_soc_report import build_report, resolve_baseline


class SocReportTests(unittest.TestCase):
    def test_baseline_resolution_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            env = {}
            sha, method = resolve_baseline(repo_root, env)
            self.assertEqual(method, "none")
            self.assertIsNone(sha)

    def test_report_generation_stable(self):
        with tempfile.TemporaryDirectory() as tmp:
            evidence_dir = Path(tmp) / "dist" / "evidence" / "abc123"
            evidence_dir.mkdir(parents=True)

            control_index = {
                "controls": [
                    {"id": "CC1.1", "status": "covered", "evidence": [{"path": "tests/report.json", "type": "test"}]},
                    {"id": "CC1.2", "status": "deferred", "evidence": []},
                ]
            }
            validation = {"status": "pass", "exceptions": [{"id": "EX-1", "expires": "2026-02-01"}]}
            meta = {"sha": "abc123"}

            (evidence_dir / "control_evidence_index.json").write_text(json.dumps(control_index))
            (evidence_dir / "validation_report.json").write_text(json.dumps(validation))
            (evidence_dir / "meta.json").write_text(json.dumps(meta))
            (evidence_dir / "checksums.sha256").write_text("checksum")

            report = build_report(evidence_dir, None, None, "none", os.environ, Path(tmp))
            self.assertEqual(report["summary"]["covered"], 1)
            self.assertEqual(report["summary"]["deferred"], 1)
            self.assertEqual(report["summary"]["exceptions_total"], 1)


if __name__ == "__main__":
    unittest.main()
