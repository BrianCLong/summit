import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from summit.structcorr.validators.json_contract import validate_json_contract


def test_json_contract_passes_required_keys() -> None:
    findings = validate_json_contract('{"id": 1, "name": "alice"}', {"required_keys": ["id", "name"]})
    severities = {item["rule"]: item["severity"] for item in findings}
    assert severities["json.parseable"] == "info"
    assert severities["json.required_keys"] == "info"


def test_json_contract_fails_invalid_json() -> None:
    findings = validate_json_contract('{"id": 1, }')
    assert findings[0]["severity"] == "fail"
    assert findings[0]["rule"] == "json.parseable"
