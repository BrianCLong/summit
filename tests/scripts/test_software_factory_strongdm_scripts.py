import json
import os
import pathlib
import subprocess
import tempfile
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DRIFT_SCRIPT = REPO_ROOT / "scripts" / "monitoring" / "software-factory-strongdm-2026-drift.py"
BENCH_SCRIPT = REPO_ROOT / "scripts" / "bench" / "scenario_suite_bench.py"


class SoftwareFactoryStrongdmScriptsTest(unittest.TestCase):
    def test_drift_script_handles_missing_reports(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                ["python3", str(DRIFT_SCRIPT)],
                cwd=tmp,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("No software factory drift", result.stdout)

            report_path = pathlib.Path(tmp) / "artifacts" / "drift" / "report.json"
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["drift_detected"], False)
            self.assertIn("no_reports_found", report["reasons"])

    def test_drift_script_fails_on_rubric_hash_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            evidence_dir = pathlib.Path(tmp) / "artifacts" / "evidence"
            report_a = evidence_dir / "run-a" / "report.json"
            report_b = evidence_dir / "run-b" / "report.json"
            report_a.parent.mkdir(parents=True, exist_ok=True)
            report_b.parent.mkdir(parents=True, exist_ok=True)

            report_a.write_text(
                json.dumps(
                    {
                        "suite": "holdout/basic",
                        "satisfaction": 0.82,
                        "rubric_hash": "r1",
                        "model_id": "m1",
                        "twin_hash": "t1",
                    }
                ),
                encoding="utf-8",
            )
            report_b.write_text(
                json.dumps(
                    {
                        "suite": "holdout/basic",
                        "satisfaction": 0.85,
                        "rubric_hash": "r2",
                        "model_id": "m1",
                        "twin_hash": "t1",
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                ["python3", str(DRIFT_SCRIPT)],
                cwd=tmp,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("drift detected", result.stdout.lower())

            drift_report = json.loads(
                (pathlib.Path(tmp) / "artifacts" / "drift" / "report.json").read_text(encoding="utf-8")
            )
            self.assertTrue(drift_report["drift_detected"])
            self.assertIn("rubric_hash_drift:holdout/basic", drift_report["reasons"])

    def test_bench_script_writes_metrics(self):
        with tempfile.TemporaryDirectory() as tmp:
            holdout_dir = pathlib.Path(tmp) / "suites" / "holdout" / "basic"
            holdout_dir.mkdir(parents=True, exist_ok=True)
            (holdout_dir / "scenario-01.yaml").write_text("id: scenario-01\n", encoding="utf-8")
            (holdout_dir / "scenario-02.yaml").write_text("id: scenario-02\n", encoding="utf-8")

            env = os.environ.copy()
            env["SCENARIO_SUITE_P95_MS"] = "543.21"

            result = subprocess.run(
                ["python3", str(BENCH_SCRIPT)],
                cwd=tmp,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            metrics_path = pathlib.Path(tmp) / "artifacts" / "bench" / "metrics.json"
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            self.assertEqual(metrics["bench"], "scenario_suite")
            self.assertEqual(metrics["suite_stats"]["suite_file_count"], 2)
            self.assertEqual(metrics["observed_p95_ms"], 543.21)
            self.assertEqual(metrics["budget_p95_ms"], 60000)

    def test_bench_script_enforces_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["SCENARIO_SUITE_P95_MS"] = "60001"
            result = subprocess.run(
                ["python3", str(BENCH_SCRIPT)],
                cwd=tmp,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("exceeds budget", (result.stderr + result.stdout).lower())


if __name__ == "__main__":
    unittest.main()
