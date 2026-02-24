from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from summit.security_debt.analyzer import analyze_security_debt


def _run(cmd: list[str], cwd: Path) -> None:
    subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, text=True)


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _init_repo(repo: Path) -> None:
    _run(["git", "init"], repo)
    _run(["git", "config", "user.email", "codex@example.com"], repo)
    _run(["git", "config", "user.name", "Codex"], repo)
    (repo / "README.md").write_text("# test\n", encoding="utf-8")
    _run(["git", "add", "README.md"], repo)
    _run(["git", "commit", "-m", "init"], repo)


class SecurityDebtAnalyzerTests(unittest.TestCase):
    def test_analyzer_outputs_are_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            repo.mkdir()
            _init_repo(repo)

            _write(
                repo / "docs/security/security-debt/dependency_risk_classifications.json",
                {"classifications": {"safe-dep": {"risk": "low", "rationale": "fixture"}}},
            )
            _write(
                repo / "docs/security/security-debt/threat_model_map.json",
                {"file_threat_map": {"agents/*.py": ["CLAIM-05"]}},
            )
            _write(
                repo / "summit/ci/gates/security_debt.yml",
                {
                    "deny_on_repeated_signatures": True,
                    "enforcement_default": "off",
                    "provenance_header": "AGENT-PROVENANCE:",
                    "threat_model_minimum_coverage": 0.8,
                },
            )

            _write(repo / "package.json", {"dependencies": {"safe-dep": "^1.0.0"}})
            source = repo / "agents/example.py"
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text(
                "# AGENT-PROVENANCE: unit-test\n# AGENT-AUTHORED: true\nprint('ok')\n",
                encoding="utf-8",
            )

            out_a = repo / "artifacts/a"
            out_b = repo / "artifacts/b"
            analyze_security_debt(
                repo_root=repo,
                output_dir=out_a,
                gate_config_path=repo / "summit/ci/gates/security_debt.yml",
            )
            analyze_security_debt(
                repo_root=repo,
                output_dir=out_b,
                gate_config_path=repo / "summit/ci/gates/security_debt.yml",
            )

            for filename in ("report.json", "metrics.json", "stamp.json", "security_debt_ledger.json"):
                self.assertEqual(
                    (out_a / filename).read_text(encoding="utf-8"),
                    (out_b / filename).read_text(encoding="utf-8"),
                )

    def test_analyzer_and_verifier_enforcement(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            repo.mkdir()
            _init_repo(repo)

            _write(repo / "docs/security/security-debt/dependency_risk_classifications.json", {"classifications": {}})
            _write(repo / "docs/security/security-debt/threat_model_map.json", {"file_threat_map": {}})
            _write(
                repo / "summit/ci/gates/security_debt.yml",
                {
                    "deny_on_repeated_signatures": True,
                    "enforcement_default": "off",
                    "provenance_header": "AGENT-PROVENANCE:",
                    "threat_model_minimum_coverage": 0.8,
                },
            )

            _write(repo / "package.json", {"dependencies": {"risky-dep": "^1.0.0"}})
            source = repo / "agents/missing_header.py"
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text("# AGENT-AUTHORED: true\nprint(eval('1+1'))\n", encoding="utf-8")

            out_dir = repo / "artifacts/security-debt"
            analyze_security_debt(
                repo_root=repo,
                output_dir=out_dir,
                gate_config_path=repo / "summit/ci/gates/security_debt.yml",
            )

            report = _read(out_dir / "report.json")
            codes = {finding["code"] for finding in report["findings"]}
            self.assertIn("UNCLASSIFIED_DEPENDENCIES", codes)
            self.assertIn("MISSING_AGENT_PROVENANCE_HEADER", codes)
            self.assertIn("THREAT_MODEL_COVERAGE_BELOW_THRESHOLD", codes)

            verifier = Path(__file__).resolve().parents[3] / "summit/ci/verify_security_debt.py"
            env_off = dict(os.environ)
            env_off["SECURITY_DEBT_ENFORCEMENT"] = "off"
            off_result = subprocess.run(
                [sys.executable, str(verifier), "--artifacts-dir", str(out_dir), "--gate-config", str(repo / "summit/ci/gates/security_debt.yml")],
                cwd=repo,
                env=env_off,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(off_result.returncode, 0)

            env_on = dict(os.environ)
            env_on["SECURITY_DEBT_ENFORCEMENT"] = "on"
            on_result = subprocess.run(
                [sys.executable, str(verifier), "--artifacts-dir", str(out_dir), "--gate-config", str(repo / "summit/ci/gates/security_debt.yml")],
                cwd=repo,
                env=env_on,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(on_result.returncode, 1)


if __name__ == "__main__":
    unittest.main()
