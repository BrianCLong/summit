from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pyarrow.parquet as pq

from paslog import (
    ChoiceDistribution,
    FieldSpec,
    FieldType,
    LogGenerator,
    LogSchema,
    LogValidator,
    NormalDistribution,
    PolicyConstraints,
    RandomHexDistribution,
    TimestampDistribution,
    UniformIntDistribution,
    ValidationResult,
    write_ndjson,
    write_parquet,
)


def build_schema() -> LogSchema:
    base_time = dt.datetime(2024, 1, 1)
    return LogSchema(
        name="app_logs",
        fields=[
            FieldSpec(
                name="timestamp",
                field_type=FieldType.TIMESTAMP,
                distribution=TimestampDistribution(
                    start=base_time,
                    end=base_time + dt.timedelta(days=1),
                ),
            ),
            FieldSpec(
                name="service",
                field_type=FieldType.STRING,
                distribution=ChoiceDistribution(["edge", "billing", "api"]),
                max_cardinality=3,
            ),
            FieldSpec(
                name="level",
                field_type=FieldType.STRING,
                distribution=ChoiceDistribution(["INFO", "WARN", "ERROR"], weights=[0.8, 0.15, 0.05]),
                max_cardinality=3,
            ),
            FieldSpec(
                name="status_code",
                field_type=FieldType.INTEGER,
                distribution=UniformIntDistribution(200, 504),
                max_cardinality=50,
            ),
            FieldSpec(
                name="latency_ms",
                field_type=FieldType.FLOAT,
                distribution=NormalDistribution(mean=120.0, stddev=15.0, bounds=(40.0, 600.0)),
            ),
            FieldSpec(
                name="request_id",
                field_type=FieldType.STRING,
                distribution=RandomHexDistribution(prefix="req-"),
                max_cardinality=10_000,
            ),
        ],
    )


def build_policy() -> PolicyConstraints:
    return PolicyConstraints(disallowed_fields={"user_email", "ssn"})


def test_generation_is_deterministic_and_valid() -> None:
    schema = build_schema()
    policy = build_policy()

    generator_a = LogGenerator(schema=schema, policy=policy, seed=1234)
    generator_b = LogGenerator(schema=schema, policy=policy, seed=1234)

    records_a = generator_a.generate(200)
    records_b = generator_b.generate(200)

    assert records_a == records_b

    validator = LogValidator(schema=schema, policy=policy)
    result = validator.validate(records_a)
    assert isinstance(result, ValidationResult)
    assert result.valid, result.errors
    assert not result.errors


def test_outputs_written(tmp_path: Path) -> None:
    schema = build_schema()
    policy = build_policy()
    generator = LogGenerator(schema=schema, policy=policy, seed=7)
    records = generator.generate(50)

    ndjson_path = write_ndjson(tmp_path / "logs.ndjson", records)
    parquet_path = write_parquet(tmp_path / "logs.parquet", records)

    assert ndjson_path.exists()
    assert parquet_path.exists()

    with ndjson_path.open("r", encoding="utf-8") as handle:
        lines = [json.loads(line) for line in handle if line.strip()]
    assert len(lines) == len(records)

    table = pq.read_table(parquet_path)
    assert table.num_rows == len(records)
    assert set(table.column_names) == {field.name for field in schema}

    validator = LogValidator(schema=schema, policy=policy)
    result = validator.validate(lines)
    assert result.valid


def test_policy_rejects_pii() -> None:
    schema = build_schema()
    policy = build_policy()
    validator = LogValidator(schema=schema, policy=policy)

    bad_records = [
        {
            "timestamp": "2024-01-01T01:00:00.000000Z",
            "service": "edge",
            "level": "INFO",
            "status_code": 200,
            "latency_ms": 120.0,
            "request_id": "req-123456789abc",
            "user_email": "alice@example.com",
        }
    ]

    result = validator.validate(bad_records)
    assert not result.valid
    assert any("user_email" in error for error in result.errors)
