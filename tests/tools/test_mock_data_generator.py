"""Tests for the Summit mock data generator utilities."""
from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

INGEST_SPEC = importlib.util.spec_from_file_location(
    "ingest_module", Path("data-pipelines/universal-ingest/ingest.py")
)
assert INGEST_SPEC and INGEST_SPEC.loader
ingest_module = importlib.util.module_from_spec(INGEST_SPEC)
sys.modules[INGEST_SPEC.name] = ingest_module
INGEST_SPEC.loader.exec_module(ingest_module)  # type: ignore[union-attr]

IngestionPipeline = ingest_module.IngestionPipeline
generate_mock_ingest_csv = ingest_module.generate_mock_ingest_csv
parse_csv = ingest_module.parse_csv

from tools.testing.mock_data import MockDataGenerator
from tools.testing.mock_data import cli as mock_cli


class MemoryLoader:
    """Minimal loader used to validate ingest metrics without Neo4j."""

    def __init__(self) -> None:
        self.entities: dict[str, dict] = {}

    def load(self, entities, relationships):
        upserts = 0
        dlq = 0
        for entity in entities:
            if entity.ingest_id in self.entities:
                dlq += 1
            else:
                self.entities[entity.ingest_id] = {
                    "id": entity.id,
                    "type": entity.type,
                    "name": entity.name,
                }
                upserts += 1
        return upserts, dlq


def test_generator_relationships_reference_entities() -> None:
    generator = MockDataGenerator(seed=7)
    dataset = generator.generate(record_count=12)

    entity_ids = {entity.id for entity in dataset.entities}
    assert entity_ids, "expected entities to be generated"

    for relationship in dataset.relationships:
        assert relationship.source_id in entity_ids
        assert relationship.target_id in entity_ids

    assert dataset.users, "expected user records"
    assert dataset.roles, "expected role records"


def test_render_postgres_sql_contains_expected_tables() -> None:
    generator = MockDataGenerator(seed=17)
    dataset = generator.generate(record_count=8)
    sql = generator.render_postgres_sql(dataset)

    assert "INSERT INTO users" in sql
    assert "INSERT INTO entities" in sql
    assert "::jsonb" in sql


def test_ingest_csv_round_trip(tmp_path: Path) -> None:
    generator = MockDataGenerator(seed=33)
    dataset = generator.generate(record_count=6)
    csv_path = tmp_path / "mock.csv"
    generator.write_ingest_csv(csv_path, dataset=dataset)

    pipeline = IngestionPipeline(MemoryLoader())
    pipeline.register(".csv", parse_csv)
    metrics = pipeline.ingest(csv_path, "MOCK")

    assert metrics["processed"] >= len(dataset.entities)
    assert metrics["upserts"] == len(pipeline.loader.entities)  # type: ignore[attr-defined]
    assert metrics["upserts"] > 0


def test_generate_mock_ingest_csv_helper(tmp_path: Path) -> None:
    output = tmp_path / "generated.csv"
    generate_mock_ingest_csv(output, record_count=4, seed=5)

    with output.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)

    assert rows, "CSV should contain records"
    assert {"id", "type", "name"}.issubset(rows[0].keys())


def test_cli_all_command_creates_expected_files(tmp_path: Path) -> None:
    sql_path = tmp_path / "seed.sql"
    cypher_path = tmp_path / "seed.cypher"
    ingest_path = tmp_path / "seed.csv"

    exit_code = mock_cli.main(
        [
            "--seed",
            "91",
            "all",
            "--records",
            "5",
            "--postgres-output",
            str(sql_path),
            "--neo4j-output",
            str(cypher_path),
            "--ingest-output",
            str(ingest_path),
        ]
    )

    assert exit_code == 0
    assert sql_path.exists()
    assert cypher_path.exists()
    assert ingest_path.exists()


@pytest.mark.parametrize("seed", [11, 11])
def test_deterministic_sql(seed: int) -> None:
    generator = MockDataGenerator(seed=seed)
    dataset = generator.generate(record_count=4)
    sql_first = generator.render_postgres_sql(dataset)

    generator_again = MockDataGenerator(seed=seed)
    dataset_again = generator_again.generate(record_count=4)
    sql_second = generator_again.render_postgres_sql(dataset_again)

    assert sql_first == sql_second
