import json
from typing import List, Dict

from .base import IngestPlugin


class JSONIngestPlugin(IngestPlugin):
    """Ingest plugin for JSON data."""

    def parse(self, data: str) -> List[Dict]:
        parsed = json.loads(data)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return [parsed]
        raise ValueError("Unsupported JSON structure")
