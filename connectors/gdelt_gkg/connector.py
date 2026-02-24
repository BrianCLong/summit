from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

from connectors.sdk.base import BaseConnector

from .schema_mapping import map_gkg_to_intelgraph, parse_gkg_line


class GDELTGKGConnector(BaseConnector):
    def __init__(self, manifest_path: str, data_path: str | None = None):
        super().__init__(manifest_path)
        self.data_path = Path(data_path) if data_path else self._default_data_path()

    def _default_data_path(self) -> Path:
        sample_path = self.manifest.get("sample_data_file")
        if not sample_path:
            raise ValueError("manifest missing sample_data_file")
        return self.connector_dir / sample_path

    def fetch_raw_data(self) -> Iterator[Any]:
        with open(self.data_path) as handle:
            for line in handle:
                if not line.strip():
                    continue
                yield parse_gkg_line(line)

    def map_to_entities(self, raw_data: Any) -> tuple[list[dict], list[dict]]:
        return map_gkg_to_intelgraph(raw_data)


if __name__ == "__main__":
    connector = GDELTGKGConnector("manifest.yaml")
    summary = connector.run()
    print(summary["stats"])
