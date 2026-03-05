import json

from summit_misinfo.governance.transparency import generate_report


def test_transparency_generation():
    json_str = generate_report(
        run_id="run-1",
        item_slug="item-1",
        detector_versions={"ead": "1.0"},
        thresholds={"burst": 50}
    )
    data = json.loads(json_str)
    assert data["run_id"] == "run-1"
    assert data["thresholds"]["burst"] == 50

def test_transparency_redaction():
    json_str = generate_report(
        run_id="run-1",
        item_slug="item-1",
        detector_versions={},
        thresholds={
            "burst": 50,
            "secret_token": "abcdef",
            "api_key": "12345",
            "nested": {"password": "pwd"},
            "my_pii_data": "sensitive"
        }
    )
    data = json.loads(json_str)
    assert data["thresholds"]["burst"] == 50
    assert data["thresholds"]["secret_token"] == "[REDACTED]"
    assert data["thresholds"]["api_key"] == "[REDACTED]"
    assert data["thresholds"]["nested"]["password"] == "[REDACTED]"
    assert data["thresholds"]["my_pii_data"] == "[REDACTED]"
