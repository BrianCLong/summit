import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from summit.structcorr.validators.sql_parse import validate_sql_structure


def test_sql_parse_blocks_multi_statement_by_default() -> None:
    findings = validate_sql_structure("SELECT 1; SELECT 2;")
    by_rule = {item["rule"]: item["severity"] for item in findings}
    assert by_rule["sql.single_statement"] == "fail"


def test_sql_parse_blocks_dangerous_statements() -> None:
    findings = validate_sql_structure("DROP TABLE users")
    by_rule = {item["rule"]: item["severity"] for item in findings}
    assert by_rule["sql.dangerous_statement"] == "fail"
