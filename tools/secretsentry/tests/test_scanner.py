from __future__ import annotations

import json
import shutil
from pathlib import Path

from secretsentry.cli import main
from secretsentry.scanner import scan_path

FIXTURE_REPO = Path(__file__).resolve().parent / "fixtures" / "sample_repo"
ALLOWLIST_FILE = FIXTURE_REPO / ".secretsentryignore"


def test_scan_detects_expected_rules():
    result = scan_path(FIXTURE_REPO, ALLOWLIST_FILE)
    rules = {finding.rule for finding in result.findings}
    assert rules == {
        "AWS Access Key",
        "AWS Secret Key",
        "Slack Token",
        "JWT",
        "GitHub Token",
        "Stripe Secret Key",
        "OAuth Client Secret",
        "High Entropy String",
    }


def test_allowlist_skips_ignored_directory():
    result = scan_path(FIXTURE_REPO, ALLOWLIST_FILE)
    assert all("ignored/" not in finding.file for finding in result.findings)


def test_default_allowlist_is_discovered(tmp_path):
    repo = tmp_path / "sample"
    shutil.copytree(FIXTURE_REPO, repo)
    result = scan_path(repo)
    assert all("ignored/" not in finding.file for finding in result.findings)


def test_relative_allowlist_path_is_resolved_against_root(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    secret = repo / "secret.txt"
    secret.write_text("AKIAABCDEFGHIJKLMNOP")
    allowlist = repo / "ignore.txt"
    allowlist.write_text("secret.txt\n")

    unignored = scan_path(repo)
    assert any(f.file == "secret.txt" for f in unignored.findings)

    ignored = scan_path(repo, "ignore.txt")
    assert ignored.findings == []


def test_allowlist_prefixed_relative_path_is_supported(monkeypatch):
    repo_root = Path(__file__).resolve().parents[3]
    monkeypatch.chdir(repo_root)
    prefixed = Path("tools/secretsentry/tests/fixtures/sample_repo/.secretsentryignore")

    baseline = scan_path(FIXTURE_REPO, ALLOWLIST_FILE)
    resolved = scan_path(FIXTURE_REPO, prefixed)

    assert resolved.findings == baseline.findings


def test_entropy_rule_ignores_normal_text(tmp_path):
    sandbox = tmp_path / "repo"
    sandbox.mkdir()
    sample = sandbox / "notes.txt"
    sample.write_text(
        """This is a regular configuration file that contains numerous words\n"
        "and numbers like 1234567890 but nothing resembling credentials."""
    )
    result = scan_path(sandbox)
    assert result.findings == []


def test_cli_outputs_match_golden(tmp_path):
    json_out = tmp_path / "report.json"
    md_out = tmp_path / "report.md"
    exit_code = main(
        [
            "scan",
            "--path",
            str(FIXTURE_REPO),
            "--allowlist",
            str(ALLOWLIST_FILE),
            "--json-report",
            str(json_out),
            "--markdown-report",
            str(md_out),
        ]
    )
    assert exit_code == 0

    golden_json = (Path(__file__).parent / "golden" / "sample_repo.json").read_text()
    golden_md = (Path(__file__).parent / "golden" / "sample_repo.md").read_text()

    assert json.loads(json_out.read_text()) == json.loads(golden_json)
    assert md_out.read_text() == golden_md


def test_cli_block_mode_returns_failure_code(tmp_path):
    json_out = tmp_path / "reports" / "report.json"
    md_out = tmp_path / "reports" / "report.md"
    exit_code = main(
        [
            "scan",
            "--path",
            str(FIXTURE_REPO),
            "--allowlist",
            str(ALLOWLIST_FILE),
            "--json-report",
            str(json_out),
            "--markdown-report",
            str(md_out),
            "--mode",
            "block",
        ]
    )
    assert exit_code == 1
    assert json_out.exists()
    assert md_out.exists()
