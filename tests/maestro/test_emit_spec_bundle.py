from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "emit_spec_bundle.py"


def input_payload() -> dict:
    return {
        "spec_version": "1.0",
        "mode": "standard",
        "title": "Maestro CLI Bundle",
        "scope": "Generate deterministic maestro artifacts",
        "section_summaries": {
            "functional_requirements": "Capture required behavior and outputs.",
            "non_functional_requirements": "Deterministic artifacts and low variance.",
            "data_model": "Structured schema with explicit IDs.",
            "agent_design": "Create Jules and Codex seeds.",
            "interfaces": "CLI input and artifact output shape.",
            "risk_analysis": "Highlight ambiguity and contradiction risks.",
            "acceptance_criteria": "MWS checks and score threshold.",
        },
        "functional_requirements": ["The CLI must emit a spec bundle file."],
        "non_functional_requirements": ["The output must be deterministic."],
        "data_model": ["The schema must carry section-level requirement IDs."],
        "agent_design": ["The engine must generate Jules and Codex seeds."],
        "interfaces": ["The script must accept input and output paths."],
        "risk_analysis": ["Pending controls should produce open questions."],
        "acceptance_criteria": [
            "All sections are present.",
            "All IDs are assigned.",
            "Seeds are generated.",
        ],
    }


class EmitSpecBundleTest(unittest.TestCase):
    def test_emit_spec_bundle_writes_expected_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "input.json"
            input_path.write_text(json.dumps(input_payload(), indent=2), encoding="utf-8")

            output_root = temp_path / "out"

            first = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--input",
                    str(input_path),
                    "--output-root",
                    str(output_root),
                    "--slug",
                    "demo",
                    "--timestamp",
                    "2026-02-25T00:00:00+00:00",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertIn("out/demo", first.stdout)

            bundle_path = output_root / "demo" / "spec_bundle.json"
            report_path = output_root / "demo" / "report.json"
            metrics_path = output_root / "demo" / "metrics.json"
            stamp_path = output_root / "demo" / "stamp.json"

            self.assertTrue(bundle_path.exists())
            self.assertTrue(report_path.exists())
            self.assertTrue(metrics_path.exists())
            self.assertTrue(stamp_path.exists())

            first_bundle = bundle_path.read_text(encoding="utf-8")
            first_report = report_path.read_text(encoding="utf-8")
            first_metrics = metrics_path.read_text(encoding="utf-8")

            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--input",
                    str(input_path),
                    "--output-root",
                    str(output_root),
                    "--slug",
                    "demo",
                    "--timestamp",
                    "2026-02-25T00:00:00+00:00",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertEqual(first_bundle, bundle_path.read_text(encoding="utf-8"))
            self.assertEqual(first_report, report_path.read_text(encoding="utf-8"))
            self.assertEqual(first_metrics, metrics_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
