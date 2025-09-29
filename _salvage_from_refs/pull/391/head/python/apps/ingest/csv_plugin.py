import csv
from io import StringIO
from typing import List, Dict

from .base import IngestPlugin


class CSVIngestPlugin(IngestPlugin):
    """Ingest plugin for CSV data."""

    def parse(self, data: str) -> List[Dict]:
        reader = csv.DictReader(StringIO(data))
        return list(reader)
