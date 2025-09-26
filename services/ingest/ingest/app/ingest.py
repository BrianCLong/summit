from __future__ import annotations

import csv
import io
import json
from collections import defaultdict
from typing import Any, Dict, Iterator, cast

import requests  # type: ignore[import-untyped]

from .models import EventEnvelope, IngestJobRequest, JobStatus
from .pii import apply_redaction, detect_pii
from .redis_stream import RedisStream

try:  # Lazy import to keep ingest lightweight when ML stack is absent in tests
    from ml.app.pipelines import PostgresPreprocessingPipeline
except Exception:  # pragma: no cover - optional dependency in minimal setups
    PostgresPreprocessingPipeline = None  # type: ignore[assignment]


async def _load_source(req: IngestJobRequest) -> str:
    if req.source.startswith("http://") or req.source.startswith("https://"):
        resp = requests.get(req.source, timeout=10)
        resp.raise_for_status()
        return cast(str, resp.text)
    with open(req.source, "r", encoding="utf-8") as f:
        return f.read()


def _iter_records(req: IngestJobRequest, raw: str) -> Iterator[Dict[str, Any]]:
    if req.source_type == "csv":
        reader = csv.DictReader(io.StringIO(raw))
        for row in reader:
            yield row
    else:  # json or s3 treated as json
        data = json.loads(raw)
        if isinstance(data, list):
            for row in data:
                yield row
        else:
            yield data


async def run_job(job_id: str, req: IngestJobRequest, stream: RedisStream) -> JobStatus:
    pii_summary: Dict[str, int] = defaultdict(int)
    processed = 0
    quality_insights: Dict[str, Any] | None = None

    if req.source_type == "postgres":
        if PostgresPreprocessingPipeline is None:  # pragma: no cover - fallback when ML package unavailable
            raise RuntimeError("Postgres preprocessing pipeline is unavailable in this environment")
        if req.postgres is None:
            raise ValueError("postgresOptions must be provided for postgres source type")
        pipeline = PostgresPreprocessingPipeline(
            connection_uri=req.source,
            table=req.postgres.table,
            query=req.postgres.query,
            index_column=req.postgres.index_column,
            npartitions=req.postgres.npartitions,
            feature_columns=req.postgres.feature_columns,
        )
        result = pipeline.run()
        quality_insights = result.quality_insights

        def _postgres_iter() -> Iterator[Dict[str, Any]]:
            for partition in result.dataframe.to_delayed():
                for row in partition.compute().to_dict(orient="records"):
                    yield row

        records = _postgres_iter()
    else:
        raw = await _load_source(req)
        records = _iter_records(req, raw)

    for record in records:
        mapped: Dict[str, str] = {}
        for src, canon in req.schema_map.items():
            if src in record and record[src] not in (None, ""):
                value = str(record[src])
                pii_types = detect_pii(value)
                for t in pii_types:
                    pii_summary[t] += 1
                mapped[canon] = apply_redaction(value, pii_types, req.redaction_rules)
        event = EventEnvelope(
            tenantId=mapped.get("tenantId", "unknown"),
            entityType=mapped.get("entityType", "generic"),
            attributes={k: v for k, v in mapped.items() if k not in {"tenantId", "entityType"}},
            provenance={"source": req.source},
            policy={"redaction": req.redaction_rules},
        )
        await stream.push(event.model_dump())
        processed += 1
    status = JobStatus(
        id=job_id,
        status="completed",
        processed=processed,
        piiSummary=dict(pii_summary),
        qualityInsights=quality_insights,
    )
    await stream.set_job(job_id, status.model_dump())
    return status
