import json
from pathlib import Path

import jsonschema

from summit_evidence.write_bundle import build_bundle, write_bundle


def _load_schema(name: str) -> dict:
    schema_path = Path("schemas/evidence") / name
    return json.loads(schema_path.read_text(encoding="utf-8"))


def test_build_bundle_matches_schemas(tmp_path: Path) -> None:
    bundle = build_bundle(mode="audit")

    jsonschema.validate(bundle["report"], _load_schema("report.schema.json"))
    jsonschema.validate(bundle["metrics"], _load_schema("metrics.schema.json"))
    jsonschema.validate(bundle["stamp"], _load_schema("stamp.schema.json"))
    jsonschema.validate(bundle["index"], _load_schema("index.schema.json"))

    write_bundle(out_dir=tmp_path, mode="audit")
    report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
    metrics = json.loads((tmp_path / "metrics.json").read_text(encoding="utf-8"))
    stamp = json.loads((tmp_path / "stamp.json").read_text(encoding="utf-8"))
    index = json.loads((tmp_path / "index.json").read_text(encoding="utf-8"))

    jsonschema.validate(report, _load_schema("report.schema.json"))
    jsonschema.validate(metrics, _load_schema("metrics.schema.json"))
    jsonschema.validate(stamp, _load_schema("stamp.schema.json"))
    jsonschema.validate(index, _load_schema("index.schema.json"))
