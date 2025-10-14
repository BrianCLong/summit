"""Tests for the MigrateVet CLI."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from tools.migratevet.scanner import scan_directory

FIXTURES = Path(__file__).parent / "fixtures" / "postgres"


class MigrateVetCLITests(unittest.TestCase):
    def test_postgres_good_fixture_clean(self) -> None:
        good_dir = FIXTURES / "good"
        issues = scan_directory(good_dir, "postgres")
        self.assertEqual([], issues)

    def test_postgres_bad_fixture_reports_expected_rules(self) -> None:
        bad_dir = FIXTURES / "bad"
        issues = scan_directory(bad_dir, "postgres")
        codes = sorted(issue.code for issue in issues)
        self.assertEqual(
            [
                "MIGRATEVET001",
                "MIGRATEVET002",
                "MIGRATEVET003",
                "MIGRATEVET004",
            ],
            codes,
        )

    def test_cli_warn_mode_exits_zero(self) -> None:
        bad_dir = FIXTURES / "bad"
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "tools.migratevet.cli",
                "check",
                "--dir",
                str(bad_dir),
                "--dialect",
                "postgres",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(0, result.returncode)
        self.assertIn("WARN", result.stdout)
        self.assertIn("warn-only", result.stderr)

    def test_cli_enforce_mode_exits_one(self) -> None:
        bad_dir = FIXTURES / "bad"
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "tools.migratevet.cli",
                "check",
                "--dir",
                str(bad_dir),
                "--dialect",
                "postgres",
                "--enforce",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(1, result.returncode)
        self.assertIn("ERROR", result.stdout)
        self.assertIn("mode: enforce", result.stderr)

    def test_large_file_budget(self) -> None:
        statement = "INSERT INTO audit_log (id, payload) VALUES (1, '{}'::jsonb);\n"
        repetitions = 4000
        with TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            sql_path = tmp_path / "large_fixture.sql"
            sql_path.write_text(statement * repetitions, encoding="utf-8")
            start = time.perf_counter()
            issues = scan_directory(tmp_path, "postgres")
            duration = time.perf_counter() - start
        self.assertEqual([], issues)
        self.assertLess(duration, 0.5, f"scan exceeded timing budget: {duration:.3f}s")


if __name__ == "__main__":
    unittest.main()
