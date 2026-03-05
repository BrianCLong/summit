import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator


def load_schema() -> dict:
    return json.loads(Path("schemas/cogwar/iw_alert.schema.json").read_text())


def test_valid_alert_fixture() -> None:
    schema = load_schema()
    alert = json.loads(Path("tests/fixtures/iw/valid_alert.json").read_text())
    Draft202012Validator(schema).validate(alert)


def test_invalid_alert_fixture() -> None:
    schema = load_schema()
    alert = json.loads(Path("tests/fixtures/iw/invalid_alert.json").read_text())
    validator = Draft202012Validator(schema)
    with pytest.raises(Exception):
        validator.validate(alert)
