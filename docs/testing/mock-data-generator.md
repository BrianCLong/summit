# Mock Data Generator for Summit Testing

The mock data generator produces realistic datasets for local development and CI scenarios. It synthesizes correlated user, entity, relationship, and audit records for both PostgreSQL and Neo4j, and can emit ingest-ready CSV files that exercise the universal ingest wizard.

## Capabilities

- **PostgreSQL seeds** – creates insert scripts that hydrate `users`, `roles`, `entities`, `relationships`, and `audit_events` with Faker-backed data.
- **Neo4j seeds** – exports Cypher statements with typed labels, ingest IDs, and relationship properties.
- **Ingest wizard fixtures** – emits CSV files that mirror what the ingest wizard expects, enabling pipeline smoke tests without sourcing external data.
- **Pipeline seeding** – optional command to route generated CSV records through the ingest wizard so a running Neo4j instance receives the mock graph.

All generation paths share a single dataset so PostgreSQL, Neo4j, and ingest artifacts stay consistent.

## Quick start commands

The `Justfile` exposes helper recipes that call the Python CLI shipped with the generator:

```bash
# Write Postgres and Neo4j fixtures into server/db/seeds
just mock-data-postgres
just mock-data-neo4j

# Emit ingest CSV into data-pipelines/universal-ingest/mock_ingest.csv
just mock-data-ingest

# Produce all three artifacts in one go
just mock-data-all

# Generate data and push it through the ingest wizard into Neo4j
just mock-data-seed
```

Each command accepts optional arguments:

- `records` – number of entities to produce (default `40`).
- `seed` – deterministic Faker seed (`just mock-data-postgres seed=123`).
- `source` – ingest source tag used by `mock-data-seed` (defaults to `MOCK-SEED`).

## Direct CLI usage

The CLI lives at `tools/testing/mock_data/cli.py`. Any subcommand accepts `--records` and `--seed`:

```bash
python -m tools.testing.mock_data.cli postgres --records 60 --seed 42
python -m tools.testing.mock_data.cli neo4j --records 60 --seed 42
python -m tools.testing.mock_data.cli ingest --records 60 --seed 42
python -m tools.testing.mock_data.cli all --records 60 --seed 42 \
  --postgres-output ./tmp/postgres.sql \
  --neo4j-output ./tmp/neo4j.cypher \
  --ingest-output ./tmp/ingest.csv

# Generate data and ingest it via the universal wizard
python -m tools.testing.mock_data.cli seed \
  --records 50 \
  --source HUMINT \
  --neo4j-uri bolt://localhost:7687 \
  --neo4j-user neo4j \
  --neo4j-password local_dev_pw
```

When `--generate-mock-csv` or `--seed-mock` flags are passed to `data-pipelines/universal-ingest/ingest.py`, the script will now invoke the generator automatically to create fixtures or to seed a running Neo4j instance.

## Python API

Import the generator for bespoke workflows:

```python
from tools.testing.mock_data import MockDataGenerator
from pathlib import Path

generator = MockDataGenerator(seed=7)
dataset = generator.generate(record_count=25)

sql = generator.render_postgres_sql(dataset)
cypher = generator.render_neo4j_cypher(dataset)
csv_path = generator.write_ingest_csv(Path("./mock.csv"), dataset=dataset)
```

The same dataset instance can be passed to each writer to keep cross-store records consistent.

## Running tests

Pytest coverage lives under `tests/tools/test_mock_data_generator.py`:

```bash
pytest tests/tools/test_mock_data_generator.py
```

The suite validates relationship integrity, SQL/Cypher rendering, ingest wizard integration, and CLI behaviour.
