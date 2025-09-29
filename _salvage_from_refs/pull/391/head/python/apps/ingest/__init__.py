"""Ingestion plugin registry."""

from typing import List, Dict

from .base import IngestPlugin
from .csv_plugin import CSVIngestPlugin
from .json_plugin import JSONIngestPlugin
from .rss_plugin import RSSIngestPlugin

PLUGINS = {
    "csv": CSVIngestPlugin(),
    "json": JSONIngestPlugin(),
    "rss": RSSIngestPlugin(),
}


def ingest(data: str, kind: str) -> List[Dict]:
    """Ingest data using a registered plugin."""
    plugin = PLUGINS.get(kind)
    if not plugin:
        raise ValueError(f"Unknown ingestion type: {kind}")
    return plugin.parse(data)
