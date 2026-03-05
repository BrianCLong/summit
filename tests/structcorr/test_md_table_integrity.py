import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from summit.structcorr.validators.md_table import validate_markdown_table


def test_markdown_table_integrity_pass() -> None:
    payload = "| a | b |\n| --- | --- |\n| 1 | 2 |"
    findings = validate_markdown_table(payload)
    assert all(item["severity"] == "info" for item in findings)


def test_markdown_table_detects_ragged_rows() -> None:
    payload = "| a | b |\n| --- | --- |\n| 1 |"
    findings = validate_markdown_table(payload)
    target = next(item for item in findings if item["rule"] == "md_table.column_consistency")
    assert target["severity"] == "fail"
