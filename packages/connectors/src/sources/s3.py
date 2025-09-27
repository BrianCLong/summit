from __future__ import annotations

"""High-throughput S3 CSV source implementation."""

import csv
import gzip
import io
import queue
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterator, List, Optional

import boto3
from boto3.s3.transfer import TransferConfig

from .base import BaseSource
from .types import RecordBatch


@dataclass(slots=True)
class _QueueWriter:
    q: "queue.Queue[Optional[bytes]]"
    chunk_size: int

    def write(self, data: bytes) -> int:  # pragma: no cover - exercised via boto3
        if not data:
            return 0
        # boto3 may hand us very large buffers; split to respect queue limits
        for offset in range(0, len(data), self.chunk_size):
            self.q.put(data[offset : offset + self.chunk_size])
        return len(data)

    def close(self) -> None:  # pragma: no cover - exercised via boto3
        self.q.put(None)


class _QueueReader(io.RawIOBase):
    def __init__(self, q: "queue.Queue[Optional[bytes]]") -> None:
        super().__init__()
        self._queue = q
        self._buffer = bytearray()
        self._closed = False

    def readable(self) -> bool:  # pragma: no cover - trivial
        return True

    def readinto(self, b: bytearray) -> int:  # pragma: no cover - thin wrapper
        if self._closed:
            return 0
        while not self._buffer:
            chunk = self._queue.get()
            if chunk is None:
                self._closed = True
                return 0
            self._buffer.extend(chunk)
        n = min(len(self._buffer), len(b))
        b[:n] = self._buffer[:n]
        del self._buffer[:n]
        return n


class S3CSVSource(BaseSource):
    """Stream CSV data from S3 with multipart downloads and backpressure."""

    def __init__(self, config: Dict[str, str]) -> None:
        super().__init__(config)
        session = boto3.session.Session(
            aws_access_key_id=config.get("aws_access_key_id"),
            aws_secret_access_key=config.get("aws_secret_access_key"),
            aws_session_token=config.get("aws_session_token"),
            region_name=config.get("region"),
        )
        self._client = session.client("s3", endpoint_url=config.get("endpoint_url"))
        self.bucket = config["bucket"]
        self.prefix = config.get("prefix")
        self.keys: List[str] = config.get("keys", [])
        self._chunk_size = int(config.get("chunk_size", 8 * 1024 * 1024))
        self._max_workers = int(config.get("max_workers", 8))
        self._buffer_chunks = int(config.get("buffer_chunks", 8))
        self._csv_dialect = config.get("dialect", "excel")

    # ------------------------------------------------------------------
    def discover(self) -> List[Dict[str, str]]:
        objects = self._list_objects()
        if not objects:
            return []
        key = objects[0]
        header = self._peek_header(key)
        schema = {name: "string" for name in header}
        return [
            {
                "name": key.split("/")[-1],
                "schema": schema,
                "bucket": self.bucket,
                "key": key,
            }
        ]

    # ------------------------------------------------------------------
    def read_full(self, stream: Dict[str, str]) -> Iterator[Dict[str, str]]:
        for batch in self.read_batches(stream):
            yield from batch.rows

    def read_batches(
        self, stream: Dict[str, str], batch_size: int = 50_000
    ) -> Iterator[RecordBatch]:
        keys = self._list_objects()
        for key in keys:
            yield from self._stream_object(key, batch_size)

    # ------------------------------------------------------------------
    # Helpers
    def _list_objects(self) -> List[str]:
        if self.keys:
            return self.keys
        keys: List[str] = []
        paginator = self._client.get_paginator("list_objects_v2")
        kwargs = {"Bucket": self.bucket}
        if self.prefix:
            kwargs["Prefix"] = self.prefix
        for page in paginator.paginate(**kwargs):
            for obj in page.get("Contents", []):
                keys.append(obj["Key"])
        return keys

    def _peek_header(self, key: str) -> List[str]:
        obj = self._client.get_object(Bucket=self.bucket, Key=key, Range="bytes=0-65535")
        body = obj["Body"].read()
        if key.endswith(".gz"):
            data = gzip.decompress(body)
        else:
            data = body
        sample = data.decode("utf-8", errors="ignore")
        reader = csv.reader(io.StringIO(sample), dialect=self._csv_dialect)
        return next(reader)

    def _stream_object(
        self, key: str, batch_size: int
    ) -> Iterator[RecordBatch]:
        head = self._client.head_object(Bucket=self.bucket, Key=key)
        content_length = int(head["ContentLength"])
        encoding = head.get("ContentEncoding")
        is_gzip = encoding == "gzip" or key.endswith(".gz")

        q: "queue.Queue[Optional[bytes]]" = queue.Queue(self._buffer_chunks)
        writer = _QueueWriter(q, self._chunk_size)
        transfer_config = TransferConfig(
            multipart_threshold=self._chunk_size,
            multipart_chunksize=self._chunk_size,
            max_concurrency=self._max_workers,
            use_threads=self._max_workers > 1,
        )

        def downloader() -> None:
            try:
                self._client.download_fileobj(
                    self.bucket,
                    key,
                    writer,
                    Config=transfer_config,
                )
            finally:
                writer.close()

        thread = threading.Thread(target=downloader, daemon=True)
        thread.start()

        buffered = io.BufferedReader(_QueueReader(q))
        if is_gzip:
            text_stream = io.TextIOWrapper(
                gzip.GzipFile(fileobj=buffered, mode="rb"), encoding="utf-8"
            )
        else:
            text_stream = io.TextIOWrapper(buffered, encoding="utf-8")

        reader = csv.DictReader(text_stream, dialect=self._csv_dialect)
        rows: List[Dict[str, str]] = []
        bytes_read = 0
        row_offset = 0
        for row in reader:
            rows.append(row)
            # ``DictReader`` consumes decoded text.  Estimate byte usage based on
            # value lengths; we also keep the total object size for provenance.
            bytes_read += sum(len(str(v).encode("utf-8")) for v in row.values())
            if len(rows) >= batch_size:
                yield RecordBatch(
                    rows=rows,
                    raw_bytes=bytes_read,
                    provenance={
                        "bucket": self.bucket,
                        "key": key,
                        "row_offset": row_offset,
                        "row_count": len(rows),
                        "content_length": content_length,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
                row_offset += len(rows)
                rows = []
                bytes_read = 0
        if rows:
            yield RecordBatch(
                rows=rows,
                raw_bytes=bytes_read,
                provenance={
                    "bucket": self.bucket,
                    "key": key,
                    "row_offset": row_offset,
                    "row_count": len(rows),
                    "content_length": content_length,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
        thread.join()
