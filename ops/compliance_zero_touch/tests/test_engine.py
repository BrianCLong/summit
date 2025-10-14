"""Unit tests for the zero-touch compliance engine."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from ops.compliance_zero_touch.engine import ComplianceOrchestrator


class ComplianceEngineTests(unittest.TestCase):
    """Validate orchestration and scoring logic."""

    def setUp(self) -> None:
        self.workspace = Path(__file__).resolve().parents[1] / "workspace"
        self.output_dir = Path(__file__).resolve().parents[1] / "artifacts-test"
        if self.output_dir.exists():
            for file in self.output_dir.iterdir():
                file.unlink()
        else:
            self.output_dir.mkdir()

    def tearDown(self) -> None:
        for file in self.output_dir.iterdir():
            file.unlink()
        self.output_dir.rmdir()

    def test_orchestrator_generates_report(self) -> None:
        orchestrator = ComplianceOrchestrator(self.workspace, self.output_dir)
        report_path = orchestrator.run()
        self.assertTrue(report_path.exists())

        payload = json.loads(report_path.read_text())
        self.assertIn("evaluations", payload)
        self.assertGreaterEqual(len(payload["evaluations"]), 4)
        self.assertIn("multi_factor_score", payload)
        frameworks = {
            requirement["framework"]
            for requirements in payload["regulatory_alignment"].values()
            for requirement in requirements
        }
        self.assertIn("GDPR", frameworks)

    def test_auto_patch_summary(self) -> None:
        orchestrator = ComplianceOrchestrator(self.workspace, self.output_dir)
        report_path = orchestrator.run()
        payload = json.loads(report_path.read_text())
        patches = payload["auto_patches"]
        self.assertTrue(any(patch["id"] == "patch-s3-encryption" for patch in patches))
        self.assertTrue(all(patch["estimated_risk_reduction"] > 0 for patch in patches))


if __name__ == "__main__":
    unittest.main()
