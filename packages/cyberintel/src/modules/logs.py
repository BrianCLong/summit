"""Fixture log loaders."""

from __future__ import annotations

import csv
from pathlib import Path


def load_dns(path: str | Path) -> list[dict[str, str]]:
    p = Path(path)
    with p.open(newline="") as fh:
        reader = csv.DictReader(fh)
        return [{"ts": row["ts"], "query": row["query"].lower()} for row in reader]
