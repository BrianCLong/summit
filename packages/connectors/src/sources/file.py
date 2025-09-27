from __future__ import annotations

"""File source connector.

The connector reads CSV files from a local path.  Each file is treated as a
single stream where the stream name matches the file name.  CSV headers are
used as the schema fields.
"""

import csv
from pathlib import Path
from typing import Dict, Iterator, List

from .base import BaseSource
from .types import RecordBatch


class FileSource(BaseSource):
    def discover(self) -> List[Dict[str, str]]:
        path = Path(self.config["path"]).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(path)
        return [
            {
                "name": path.stem,
                "path": str(path),
                "schema": self._infer_schema(path),
            }
        ]

    def _infer_schema(self, path: Path) -> Dict[str, str]:
        with path.open("r", newline="") as f:
            reader = csv.DictReader(f)
            return {name: "string" for name in reader.fieldnames or []}

    def read_full(self, stream: Dict[str, str]) -> Iterator[Dict[str, str]]:
        for batch in self.read_batches(stream):
            for row in batch.rows:
                yield row

    def read_batches(
        self, stream: Dict[str, str], batch_size: int = 50_000
    ) -> Iterator[RecordBatch]:
        path = Path(stream["path"])
        with path.open("r", newline="") as f:
            reader = csv.DictReader(f)
            rows: List[Dict[str, str]] = []
            bytes_read = 0
            row_offset = 0
            for row in reader:
                rows.append(row)
                bytes_read += sum(len(str(v).encode("utf-8")) for v in row.values())
                if len(rows) >= batch_size:
                    yield RecordBatch(
                        rows=rows,
                        raw_bytes=bytes_read,
                        provenance={
                            "stream": stream.get("name"),
                            "row_offset": row_offset,
                            "row_count": len(rows),
                            "path": str(path),
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
                        "stream": stream.get("name"),
                        "row_offset": row_offset,
                        "row_count": len(rows),
                        "path": str(path),
                    },
                )
