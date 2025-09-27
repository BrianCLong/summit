import json
import sys
from pathlib import Path

import boto3
import pandas as pd
from moto import mock_s3

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "connectors" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import orchestrator  # type: ignore
from models import ConnectorKind, store  # type: ignore


def _reset_store() -> None:
    store.connectors.clear()
    store.streams.clear()
    store.runs.clear()
    store.dq_rules.clear()
    store._ids = {"connector": 0, "stream": 0, "run": 0, "dq": 0}


@mock_s3
def test_s3_ingest_with_dedupe_and_parquet(tmp_path: Path) -> None:
    _reset_store()
    client = boto3.client("s3", region_name="us-east-1")
    bucket = "test-bucket"
    client.create_bucket(Bucket=bucket)
    body = "id,name\n1,Alice\n1,Alice\n2,Bob\n3,Charlie\n"
    client.put_object(Bucket=bucket, Key="people.csv", Body=body.encode("utf-8"))

    config = {
        "bucket": bucket,
        "keys": ["people.csv"],
        "region": "us-east-1",
        "batch_size": 2,
        "dedupe": {"keys": ["id"], "capacity": 10},
        "output_path": str(tmp_path),
    }

    connector = store.create_connector("s3", ConnectorKind.S3, config)
    stream = orchestrator.SOURCES["S3"](config).discover()[0]
    store.add_stream(connector.id, stream["name"], stream["schema"])
    run = store.create_run(connector.id)

    mapping_yaml = """
entity: Person
fields:
  id: id
  name: name
"""

    run = orchestrator.run_pipeline(run, mapping_yaml, None)

    assert run.status == orchestrator.RunStatus.SUCCEEDED
    assert run.stats["rowCount"] == 3
    assert run.stats["metrics"]["dedupe_hits"] == 1
    assert run.stats["metrics"]["rows_per_second"] > 0
    assert run.stats["metrics"]["mb_per_second"] >= 0

    parquet_files = run.stats["artifacts"]["parquet"]
    assert parquet_files
    df = pd.concat([pd.read_parquet(path) for path in parquet_files], ignore_index=True)
    assert set(df.columns) == {"entityType", "externalIds.id", "attrs.name"}
    assert sorted(df["externalIds.id"].tolist()) == ["1", "2", "3"]

    provenance_files = run.stats["artifacts"]["provenance"]
    assert provenance_files
    payload = json.loads(Path(provenance_files[0]).read_text())
    assert payload["provenance"]["key"] == "people.csv"
    assert payload["rows"]
    assert {row["id"] for row in payload["rows"]} <= {"1", "2", "3"}


@mock_s3
def test_s3_gzip_batches(tmp_path: Path) -> None:
    _reset_store()
    client = boto3.client("s3", region_name="us-east-1")
    bucket = "gzip-bucket"
    client.create_bucket(Bucket=bucket)

    import gzip
    from io import BytesIO

    buf = BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb") as gz:
        gz.write("id,name\n1,Alice\n2,Bob\n".encode("utf-8"))
    client.put_object(
        Bucket=bucket,
        Key="data.csv.gz",
        Body=buf.getvalue(),
        ContentEncoding="gzip",
    )

    config = {
        "bucket": bucket,
        "keys": ["data.csv.gz"],
        "region": "us-east-1",
        "batch_size": 1,
        "output_path": str(tmp_path),
    }

    connector = store.create_connector("s3-gz", ConnectorKind.S3, config)
    stream = orchestrator.SOURCES["S3"](config).discover()[0]
    store.add_stream(connector.id, stream["name"], stream["schema"])
    run = store.create_run(connector.id)

    run = orchestrator.run_pipeline(run, None, None)
    assert run.status == orchestrator.RunStatus.SUCCEEDED
    assert run.stats["rowCount"] == 2
    assert run.stats["metrics"]["rows_per_second"] > 0
    assert all(Path(p).exists() for p in run.stats["artifacts"]["parquet"])
