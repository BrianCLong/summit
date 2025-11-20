import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast

import pytest

fakeredis = pytest.importorskip("fakeredis.aioredis")

from ingest.app.ingest import run_job
from ingest.app.models import IngestJobRequest
from ingest.app.redis_stream import RedisStream, STREAM_NAME


BASE = Path(__file__).resolve().parent.parent


def load_json(path: str) -> dict[str, Any]:
    with open(BASE / path, "r", encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))


async def _run() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    stream = RedisStream()
    stream._redis = fake

    schema_map = load_json("sample_data/mapping.json")
    redaction = load_json("sample_data/redaction.json")
    req = IngestJobRequest(
        sourceType="csv",
        source=str(BASE / "sample_data/sample.csv"),
        schemaMap=schema_map,
        redactionRules=redaction,
    )
    status = await run_job("job1", req, stream)
    assert status.processed == 2
    entries = await fake.xrange(STREAM_NAME)
    assert len(entries) == 2
    data = json.loads(entries[0][1]["event"])
    assert data["tenantId"] == "t1"
    assert data["entityType"] == "person"
    assert data["attributes"]["email"] == "[REDACTED]"


def test_ingest_run() -> None:
    asyncio.run(_run())


def test_postgres_ingest(monkeypatch: pytest.MonkeyPatch) -> None:
    from ingest.app import ingest as ingest_module

    captured_kwargs: dict[str, Any] = {}

    class DummyPartition:
        def __init__(self, rows: list[dict[str, Any]]):
            self._rows = rows

        def to_dict(self, orient: str) -> list[dict[str, Any]]:
            assert orient == "records"
            return [dict(row) for row in self._rows]

    class DummyDelayed:
        def __init__(self, rows: list[dict[str, Any]]):
            self._rows = rows

        def compute(self) -> DummyPartition:
            return DummyPartition(self._rows)

    class DummyFrame:
        def __init__(self, rows: list[dict[str, Any]]):
            self._rows = rows

        def to_delayed(self) -> list[DummyDelayed]:
            return [DummyDelayed(self._rows)]

    class DummyPipeline:
        def __init__(self, **kwargs: Any) -> None:
            captured_kwargs.update(kwargs)

        def run(self) -> SimpleNamespace:
            rows = [
                {"tenant": "t1", "entity": "person", "value_a": 1.0},
                {"tenant": "t2", "entity": "person", "value_a": 2.0},
            ]
            insights = {
                "timingsMs": {"load_data": 1.0},
                "featureStats": {},
                "anomalySummary": {"total": len(rows), "anomalyRate": 0.0, "anomalies": 0},
            }
            return SimpleNamespace(dataframe=DummyFrame(rows), quality_insights=insights)

    monkeypatch.setattr(ingest_module, "PostgresPreprocessingPipeline", DummyPipeline)

    fake = fakeredis.FakeRedis(decode_responses=True)
    stream = RedisStream()
    stream._redis = fake

    req = IngestJobRequest(
        sourceType="postgres",
        source="postgresql://example",
        schemaMap={"tenant": "tenantId", "entity": "entityType", "value_a": "valueA"},
        redactionRules={},
        postgresOptions={"table": "observations", "indexColumn": "id", "featureColumns": ["value_a"]},
    )

    status = asyncio.run(run_job("pg-job", req, stream))

    assert status.processed == 2
    assert status.qualityInsights is not None
    assert status.qualityInsights["anomalySummary"]["total"] == 2
    assert captured_kwargs["table"] == "observations"
    entries = asyncio.run(fake.xrange(STREAM_NAME))
    assert len(entries) == 2


def test_event_envelope_contract() -> None:
    from ingest.app.models import EventEnvelope

    envelope = EventEnvelope(
        tenantId="t",
        entityType="e",
        attributes={},
        provenance={},
        policy={},
    )
    assert set(envelope.model_dump().keys()) == {
        "tenantId",
        "entityType",
        "attributes",
        "provenance",
        "policy",
    }
