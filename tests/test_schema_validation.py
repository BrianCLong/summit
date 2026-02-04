import json
import pathlib

from jsonschema import Draft202012Validator


def load_schema(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_schemas_are_valid() -> None:
    root = pathlib.Path(__file__).resolve().parents[1]
    schemas = sorted((root / "schemas").rglob("*.schema.json"))
    assert schemas
    for schema_path in schemas:
        schema = load_schema(schema_path)
        Draft202012Validator.check_schema(schema)


def test_campaign_schema_denies_unknown_fields() -> None:
    root = pathlib.Path(__file__).resolve().parents[1]
    schema = load_schema(root / "schemas" / "cogwar" / "campaign.schema.json")

    valid = {
        "id": "camp-1",
        "title": "Sample",
        "theater": "test",
        "timebox": {"start": "2022-01-01", "end": "2022-12-31"},
        "actors": ["actor-a"],
        "channels": [{"type": "web", "handle": "example.com"}],
        "narratives": [
            {
                "name": "n1",
                "frame": "frame",
                "claim_family": "claim",
                "target_audience": "audience",
                "intended_effect": "effect",
            }
        ],
        "timing": [{"event_name": "event", "window": "pre"}],
        "indicators": [
            {"type": "keyword", "value": "dirty bomb", "confidence": "low"}
        ],
        "provenance": [{"source": "https://example.com", "retrieved_via": "manual"}],
    }

    invalid = dict(valid)
    invalid["unexpected"] = "nope"

    validator = Draft202012Validator(schema)
    assert not list(validator.iter_errors(valid))
    assert list(validator.iter_errors(invalid))
