import argparse
import json
from pathlib import Path
from typing import Any, Dict

from jsonschema import Draft202012Validator, RefResolver
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_ROOT = ROOT / "v1"

ENTITY_SCHEMAS = {
    "Person": SCHEMA_ROOT / "entities" / "person.schema.json",
    "Organization": SCHEMA_ROOT / "entities" / "organization.schema.json",
    "Asset": SCHEMA_ROOT / "entities" / "asset.schema.json",
    "Event": SCHEMA_ROOT / "entities" / "event.schema.json",
    "Location": SCHEMA_ROOT / "entities" / "location.schema.json",
    "Case": SCHEMA_ROOT / "entities" / "case.schema.json",
    "Evidence": SCHEMA_ROOT / "entities" / "evidence.schema.json",
    "Claim": SCHEMA_ROOT / "entities" / "claim.schema.json",
    "License": SCHEMA_ROOT / "entities" / "license.schema.json",
    "PolicyTag": SCHEMA_ROOT / "entities" / "policy_tag.schema.json",
}
RELATIONSHIP_SCHEMA = SCHEMA_ROOT / "relationships" / "relationship.schema.json"
SAMPLES_ROOT = ROOT / "samples" / "v1"


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_validator(schema_path: Path) -> Draft202012Validator:
    schema = load_json(schema_path)
    resolver = RefResolver(base_uri=schema_path.resolve().as_uri(), referrer=schema)
    return Draft202012Validator(schema, resolver=resolver)


def infer_schema(sample: Dict[str, Any]) -> Path:
    if "relationshipType" in sample:
        return RELATIONSHIP_SCHEMA
    entity_type = sample.get("entityType")
    if entity_type not in ENTITY_SCHEMAS:
        raise KeyError(f"Unknown entityType '{entity_type}' in sample")
    return ENTITY_SCHEMAS[entity_type]


def validate_sample_file(path: Path) -> None:
    sample = load_json(path)
    schema_path = infer_schema(sample)
    validator = build_validator(schema_path)
    validator.validate(sample)


def validate_all_samples() -> None:
    samples = list((SAMPLES_ROOT / "entities").glob("*.json")) + list(
        (SAMPLES_ROOT / "relationships").glob("*.json")
    )
    if not samples:
        raise FileNotFoundError("No samples found to validate")
    for sample_path in samples:
        try:
            validate_sample_file(sample_path)
            print(f"✔ {sample_path.relative_to(ROOT)} valid")
        except ValidationError as err:
            raise AssertionError(f"Validation failed for {sample_path}: {err.message}") from err


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate canonical domain-model samples against schemas")
    parser.add_argument("--sample", type=Path, help="Optional path to a specific sample JSON file")
    args = parser.parse_args()

    if args.sample:
        validate_sample_file(args.sample)
        print(f"✔ {args.sample} valid")
    else:
        validate_all_samples()
