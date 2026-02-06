from __future__ import annotations

import hashlib
import json
import os
import random
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from .openlineage_emit import maybe_emit_openlineage

RUNTIME_EXCLUDE = {"_ts", "_lsn", "_tx"}
DEFAULT_INPUT_NAME = "postgres.public.*"


@dataclass(frozen=True)
class LineageConfig:
    namespace: str
    job: str
    output_dir: str
    input_name: str
    row_digests_include: bool
    emit_openlineage: bool
    require_emit: bool
    run_id: str | None


def _sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _stable_json_bytes(obj: object) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compute_row_digest(row: dict) -> str:
    stable = {key: row[key] for key in sorted(row) if key not in RUNTIME_EXCLUDE}
    return _sha256_hex(_stable_json_bytes(stable))


def compute_run_digest(row_digests: Iterable[str]) -> str:
    ordered = "\n".join(sorted(row_digests)).encode("utf-8")
    return _sha256_hex(ordered)


def _uuid7() -> str:
    unix_ms = int(time.time() * 1000)
    rand_a = random.getrandbits(12)
    rand_b = random.getrandbits(62)
    uuid_int = (
        (unix_ms << 80)
        | (0x7 << 76)
        | (rand_a << 64)
        | (0x2 << 62)
        | rand_b
    )
    return str(uuid.UUID(int=uuid_int))


def _load_config() -> LineageConfig:
    return LineageConfig(
        namespace=os.getenv("OL_NAMESPACE", "summit"),
        job=os.getenv("OL_JOB", "postgres-change-run"),
        output_dir=os.getenv("LINEAGE_OUT", "artifacts/lineage"),
        input_name=os.getenv("OL_INPUT", DEFAULT_INPUT_NAME),
        row_digests_include=os.getenv("ROW_DIGESTS_INCLUDE", "1") == "1",
        emit_openlineage=os.getenv("LINEAGE_EMIT", "0") == "1",
        require_emit=os.getenv("LINEAGE_REQUIRE_EMIT", "0") == "1",
        run_id=os.getenv("LINEAGE_RUN_ID"),
    )


def write_manifest(
    output_dir: str,
    namespace: str,
    job: str,
    run_id: str,
    row_digests: list[str],
    input_name: str,
    include_rows: bool,
) -> str:
    run_digest = compute_run_digest(row_digests)
    manifest = {
        "version": 1,
        "namespace": namespace,
        "job": job,
        "run_id": run_id,
        "run_digest": run_digest,
        "algo": "sha256",
        "inputs": [
            {
                "name": input_name,
                "facets": {
                    "digest": {
                        "sha256": run_digest,
                    }
                },
            }
        ],
        "row_digests": row_digests if include_rows else [],
    }
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"run-{run_id}.json")
    with open(path, "wb") as handle:
        handle.write(_stable_json_bytes(manifest))
    return path


def write_stamp(output_dir: str, source: str, count: int, run_id: str) -> str:
    stamp = {
        "emitted_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "count": count,
        "run_id": run_id,
    }
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "stamp.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(stamp, handle, indent=2)
    return path


def emit_run(change_events: list[dict]) -> str:
    config = _load_config()
    run_id = config.run_id or _uuid7()

    row_digests: list[str] = []
    for event in change_events:
        if "row" not in event:
            raise KeyError("change event missing required 'row' key")
        row_digests.append(compute_row_digest(event["row"]))

    sorted_row_digests = sorted(row_digests)

    manifest_path = write_manifest(
        output_dir=config.output_dir,
        namespace=config.namespace,
        job=config.job,
        run_id=run_id,
        row_digests=sorted_row_digests,
        input_name=config.input_name,
        include_rows=config.row_digests_include,
    )
    stamp_path = write_stamp(
        output_dir=config.output_dir,
        source="postgres",
        count=len(change_events),
        run_id=run_id,
    )

    maybe_emit_openlineage(
        namespace=config.namespace,
        job=config.job,
        run_id=run_id,
        run_digest=compute_run_digest(sorted_row_digests),
        input_name=config.input_name,
        manifest_path=manifest_path,
        stamp_path=stamp_path,
        emit_enabled=config.emit_openlineage,
        require_emit=config.require_emit,
    )

    return run_id


def _load_fixture(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError("fixture payload must be a list of change events")
    return payload


def main() -> None:
    fixture_path = os.getenv(
        "LINEAGE_FIXTURE", "tests/lineage/fixtures/change_events.json"
    )
    events = _load_fixture(fixture_path)
    run_id = emit_run(events)
    print(run_id)


if __name__ == "__main__":
    main()
