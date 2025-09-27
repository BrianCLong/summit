from __future__ import annotations

"""Connector source SDK.

This is a very small portion of the envisioned SDK.  Sources implement two
methods: ``discover`` which inspects available streams and ``read_full`` which
returns an iterator of records.  Incremental/CDC is omitted for brevity.
"""

from typing import Dict, Iterator, List

from .types import RecordBatch


class BaseSource:
    """Base class for sources."""

    def __init__(self, config: Dict[str, str]) -> None:
        self.config = config

    def discover(self) -> List[Dict[str, str]]:
        """Return a list of stream definitions."""
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Batch helpers
    def read_batches(
        self, stream: Dict[str, str], batch_size: int = 50_000
    ) -> Iterator[RecordBatch]:
        """Yield :class:`RecordBatch` objects.

        Sub-classes are encouraged to override this method to provide more
        efficient batching semantics.  The default implementation materializes
        ``batch_size`` records from :meth:`read_full` and annotates each batch
        with minimal provenance information.
        """

        rows: List[Dict[str, str]] = []
        bytes_read = 0
        total_rows = 0
        for row in self.read_full(stream):
            rows.append(row)
            total_rows += 1
            # Heuristic byte estimate (sum of field lengths).  Sub-classes
            # should override ``read_batches`` to provide exact figures.
            bytes_read += sum(len(str(v).encode("utf-8")) for v in row.values())
            if len(rows) >= batch_size:
                yield RecordBatch(
                    rows=rows,
                    raw_bytes=bytes_read,
                    provenance={
                        "stream": stream.get("name"),
                        "row_offset": total_rows - len(rows),
                        "row_count": len(rows),
                    },
                )
                rows = []
                bytes_read = 0
        if rows:
            yield RecordBatch(
                rows=rows,
                raw_bytes=bytes_read,
                provenance={
                    "stream": stream.get("name"),
                    "row_offset": total_rows - len(rows),
                    "row_count": len(rows),
                },
            )

    def read_full(self, stream: Dict[str, str]) -> Iterator[Dict[str, str]]:
        """Yield dictionaries for each record in the stream."""
        raise NotImplementedError
