import json
import os
from pathlib import Path

import jsonschema

from services.lineage.emitter import emit_run


def _load_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_manifest_determinism_and_schema(tmp_path: Path) -> None:
    fixture = Path("tests/lineage/fixtures/change_events.json")
    events = json.loads(fixture.read_text(encoding="utf-8"))

    os.environ["LINEAGE_OUT"] = str(tmp_path)
    os.environ["LINEAGE_RUN_ID"] = "018f3b9e-6c2f-7a00-8000-000000000001"
    os.environ["ROW_DIGESTS_INCLUDE"] = "1"

    run_id_first = emit_run(events)
    manifest_path = tmp_path / f"run-{run_id_first}.json"
    manifest_bytes_first = manifest_path.read_bytes()

    run_id_second = emit_run(events)
    manifest_bytes_second = manifest_path.read_bytes()

    assert run_id_first == run_id_second
    assert manifest_bytes_first == manifest_bytes_second

    schema = json.loads(
        Path("schemas/lineage/run-manifest.schema.json").read_text(
            encoding="utf-8"
        )
    )
    jsonschema.validate(instance=_load_manifest(manifest_path), schema=schema)

    assert b"emitted_at" not in manifest_bytes_first
    stamp = json.loads((tmp_path / "stamp.json").read_text(encoding="utf-8"))
    assert "emitted_at" in stamp
