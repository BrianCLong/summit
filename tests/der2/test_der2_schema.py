import json
from pathlib import Path

import pytest

jsonschema = pytest.importorskip("jsonschema")

from benchmarks.der2.runner import run_der2

FIXTURES_ROOT = Path("benchmarks/der2/fixtures")
SCHEMA_ROOT = Path("benchmarks/der2/schemas")


def _load_schema(name: str) -> dict:
    return json.loads((SCHEMA_ROOT / name).read_text())


def test_output_schema_validation(tmp_path: Path) -> None:
    output_dir = tmp_path / "artifacts"

    paths = run_der2(
        bench_id="schema-test",
        frozen_library_dir=FIXTURES_ROOT / "frozen_library",
        tasks_path=FIXTURES_ROOT / "tasks.jsonl",
        concepts_path=FIXTURES_ROOT / "concepts.jsonl",
        output_dir=output_dir,
        model_name="dummy",
        regimes=("instruction_only", "concepts", "related_only", "full_set"),
    )

    report = json.loads(Path(paths["report"]).read_text())
    metrics = json.loads(Path(paths["metrics"]).read_text())
    stamp = json.loads(Path(paths["stamp"]).read_text())

    jsonschema.validate(report, _load_schema("report.schema.json"))
    jsonschema.validate(metrics, _load_schema("metrics.schema.json"))
    jsonschema.validate(stamp, _load_schema("stamp.schema.json"))
