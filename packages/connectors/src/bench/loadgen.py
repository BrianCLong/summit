from __future__ import annotations

"""Synthetic load generator for S3 CSV ingest workers."""

import argparse
import csv
import io
import time
from dataclasses import dataclass
from typing import List

import boto3

DEFAULT_ROW = {
    "id": "0000000000",
    "name": "Example",
    "email": "example@example.com",
}


@dataclass
class BenchResult:
    rows: int
    bytes_written: int
    duration: float

    @property
    def mbps(self) -> float:
        return (self.bytes_written / (1024 * 1024)) / self.duration if self.duration else 0.0

    @property
    def rps(self) -> float:
        return self.rows / self.duration if self.duration else 0.0


def _generate_csv(rows: int, row_template: dict[str, str]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(row_template))
    writer.writeheader()
    for idx in range(rows):
        record = {k: (v if k != "id" else f"{idx:010d}") for k, v in row_template.items()}
        writer.writerow(record)
    return buf.getvalue().encode("utf-8")


def upload_fixture(bucket: str, prefix: str, size_mb: int, client: boto3.client) -> List[str]:
    keys: List[str] = []
    rows_per_mb = 25_000  # approx 40 bytes/row
    rows = rows_per_mb * size_mb
    payload = _generate_csv(rows, DEFAULT_ROW)
    key = f"{prefix.rstrip('/')}/bench-{int(time.time())}.csv"
    client.put_object(Bucket=bucket, Key=key, Body=payload)
    keys.append(key)
    return keys


def run_bench(bucket: str, prefix: str, size_mb: int) -> BenchResult:
    session = boto3.session.Session()
    client = session.client("s3")
    start = time.perf_counter()
    keys = upload_fixture(bucket, prefix, size_mb, client)
    rows_per_mb = 25_000
    total_rows = rows_per_mb * size_mb
    total_bytes = size_mb * 1024 * 1024
    # S3 upload is synchronous; use elapsed time as baseline throughput.
    duration = time.perf_counter() - start
    return BenchResult(rows=total_rows, bytes_written=total_bytes, duration=duration)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic CSV load in S3")
    parser.add_argument("bucket", help="Target S3 bucket")
    parser.add_argument("prefix", help="Prefix to upload synthetic CSV files")
    parser.add_argument("--size-mb", type=int, default=1024, help="Total size of CSV fixture to upload")
    args = parser.parse_args()

    result = run_bench(args.bucket, args.prefix, args.size_mb)
    print(
        f"uploaded {result.bytes_written / (1024 * 1024):.2f} MiB in {result.duration:.2f}s "
        f"({result.mbps:.2f} MB/s, {result.rps:.0f} rows/s)"
    )


if __name__ == "__main__":  # pragma: no cover
    main()
