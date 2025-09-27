from __future__ import annotations

"""Pipeline orchestration for a single run.

This is a synchronous, in-process implementation used for unit tests.  It
performs extraction via the source connector, applies mappings and runs a
``not_null`` data quality check if configured.
"""

import json
import statistics
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Mapping

import pandas as pd

import dq
import mapping
from models import Run, RunStatus, store
from sources.file import FileSource
from sources.s3 import S3CSVSource
from utils.bloom import BloomFilter

# Registry of available source classes
SOURCES = {
    "FILE": FileSource,
    "S3": S3CSVSource,
}


def run_pipeline(run: Run, map_yaml: str | None, dq_field: str | None) -> Run:
    conn = store.connectors[run.connector_id]
    source_cls = SOURCES[conn.kind.value]
    source: BaseSource = source_cls(conn.config)

    streams = source.discover()
    if not streams:
        run.status = RunStatus.FAILED
        run.dq_failures.append("no streams discovered")
        return run

    stream = streams[0]
    run.status = RunStatus.RUNNING

    batch_size = int(conn.config.get("batch_size", 50_000))
    dedupe_conf = conn.config.get("dedupe", {})
    dedupe_keys: List[str] = dedupe_conf.get("keys", [])
    bloom: BloomFilter | None = None
    if dedupe_keys:
        bloom = BloomFilter(
            capacity=int(dedupe_conf.get("capacity", 1_000_000)),
            error_rate=float(dedupe_conf.get("error_rate", 0.001)),
        )

    mapping_conf = mapping.parse_mapping(map_yaml) if map_yaml else None
    output_dir = Path(conn.config.get("output_path", "./data")) / f"run-{run.id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    total_rows = 0
    total_bytes = 0
    dedupe_hits = 0
    latencies: List[float] = []
    provenance: List[Dict[str, object]] = []
    parquet_files: List[str] = []
    provenance_files: List[str] = []
    dq_errors: List[str] = []

    start_time = time.perf_counter()
    for batch_idx, batch in enumerate(source.read_batches(stream, batch_size=batch_size)):
        batch_start = time.perf_counter()
        filtered_rows: List[Mapping[str, str]] = []
        batch_dedupe = 0
        for row in batch.rows:
            if bloom and dedupe_keys:
                key = tuple(str(row.get(k, "")) for k in dedupe_keys)
                if bloom.check_and_add(key):
                    batch_dedupe += 1
                    continue
            filtered_rows.append(row)
        dedupe_hits += batch_dedupe

        if not filtered_rows:
            latencies.append(time.perf_counter() - batch_start)
            provenance.append(batch.provenance | {"batch_index": batch_idx, "dedupe_dropped": batch_dedupe})
            continue

        normalized_rows: List[Dict[str, str]] = []
        if mapping_conf:
            for r in filtered_rows:
                norm = mapping.apply_mapping(r, mapping_conf)
                flat = _flatten_normalized(norm)
                normalized_rows.append(flat)
        else:
            normalized_rows = [dict(r) for r in filtered_rows]

        if dq_field:
            errs = dq.run_dq(normalized_rows, dq_field)
            dq_errors.extend(errs)
            if errs:
                run.status = RunStatus.FAILED

        parquet_path, provenance_path = _persist_batch(
            output_dir,
            batch_idx,
            normalized_rows,
            filtered_rows,
            batch.provenance,
        )
        parquet_files.append(str(parquet_path))
        provenance_files.append(str(provenance_path))

        total_rows += len(filtered_rows)
        total_bytes += batch.raw_bytes or int(batch.provenance.get("content_length", 0))
        latencies.append(time.perf_counter() - batch_start)
        provenance.append(batch.provenance | {"batch_index": batch_idx, "dedupe_dropped": batch_dedupe})

    total_duration = max(time.perf_counter() - start_time, 1e-6)

    if dq_errors:
        run.dq_failures.extend(dq_errors)
        run.finished_at = datetime.utcnow()
        run.stats = {
            "rowCount": total_rows,
            "bytesProcessed": total_bytes,
            "metrics": {
                "rows_per_second": total_rows / total_duration if total_duration else 0.0,
                "mb_per_second": (total_bytes / 1024 / 1024) / total_duration if total_duration else 0.0,
                "dedupe_hits": dedupe_hits,
                "batch_latency_p95": 0.0,
            },
            "provenance": provenance,
            "artifacts": {
                "parquet": parquet_files,
                "provenance": provenance_files,
            },
        }
        return run

    run.status = RunStatus.SUCCEEDED
    run.finished_at = datetime.utcnow()
    batch_latency_p95 = 0.0
    if latencies:
        if len(latencies) >= 20:
            batch_latency_p95 = statistics.quantiles(latencies, n=100)[94]
        else:
            batch_latency_p95 = max(latencies)

    run.stats = {
        "rowCount": total_rows,
        "bytesProcessed": total_bytes,
        "metrics": {
            "rows_per_second": total_rows / total_duration if total_duration else 0.0,
            "mb_per_second": (total_bytes / 1024 / 1024) / total_duration if total_duration else 0.0,
            "dedupe_hits": dedupe_hits,
            "batch_latency_p95": batch_latency_p95,
        },
        "provenance": provenance,
        "artifacts": {
            "parquet": parquet_files,
            "provenance": provenance_files,
        },
    }
    return run


def _flatten_normalized(row: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    flat: Dict[str, str] = {"entityType": row["entityType"]}
    for key, value in row["externalIds"].items():
        flat[f"externalIds.{key}"] = value
    for key, value in row["attrs"].items():
        flat[f"attrs.{key}"] = value
    return flat


def _persist_batch(
    output_dir: Path,
    batch_idx: int,
    normalized_rows: List[Dict[str, str]],
    raw_rows: List[Mapping[str, str]],
    provenance: Dict[str, object],
) -> tuple[Path, Path]:
    parquet_path = output_dir / f"batch-{batch_idx:04d}.parquet"
    provenance_path = output_dir / f"batch-{batch_idx:04d}-provenance.json"

    df = pd.DataFrame(normalized_rows)
    df.to_parquet(parquet_path, index=False)

    prov_payload = {
        "provenance": provenance,
        "rows": [dict(r) for r in raw_rows],
    }
    provenance_path.write_text(json.dumps(prov_payload, indent=2))
    return parquet_path, provenance_path
