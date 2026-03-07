from __future__ import annotations

import argparse
import gzip
import zipfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any

try:
    from connectors.sdk.base import BaseConnector
except ModuleNotFoundError:  # local execution from repository root with PYTHONPATH unset
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from connectors.sdk.base import BaseConnector

from connectors.gdelt_gkg.schema_mapping import map_gkg_to_intelgraph, parse_gkg_line


class GDELTGKGConnector(BaseConnector):
    def __init__(self, manifest_path: str, data_path: str | None = None):
        super().__init__(manifest_path)
        self.data_path = Path(data_path) if data_path else self._default_data_path()

    def _default_data_path(self) -> Path:
        sample_path = self.manifest.get("sample_data_file")
        if not sample_path:
            raise ValueError("manifest missing sample_data_file")
        return self.connector_dir / sample_path

    def _iter_lines(self) -> Iterator[str]:
        suffix = self.data_path.suffix.lower()
        if suffix == ".gz":
            with gzip.open(self.data_path, mode="rt", encoding="utf-8") as handle:
                yield from handle
            return
        if suffix == ".zip":
            with zipfile.ZipFile(self.data_path) as archive:
                names = [name for name in archive.namelist() if not name.endswith("/")]
                if len(names) != 1:
                    raise ValueError(
                        f"Expected exactly one file inside {self.data_path}, found {len(names)}"
                    )
                with archive.open(names[0], mode="r") as file_handle:
                    for raw_line in file_handle:
                        yield raw_line.decode("utf-8")
            return

        with open(self.data_path, encoding="utf-8") as handle:
            yield from handle

    def fetch_raw_data(self) -> Iterator[Any]:
        for line in self._iter_lines():
            if not line.strip():
                continue
            yield parse_gkg_line(line)

    def map_to_entities(self, raw_data: Any) -> tuple[list[dict], list[dict]]:
        return map_gkg_to_intelgraph(raw_data)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run GDELT GKG sample connector")
    parser.add_argument(
        "--manifest",
        default=str(Path(__file__).resolve().parent / "manifest.yaml"),
        help="Path to connector manifest",
    )
    parser.add_argument("--input", help="Optional TSV/TSV.GZ/ZIP data file")
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    connector = GDELTGKGConnector(manifest_path=args.manifest, data_path=args.input)
    summary = connector.run()
    print(summary["stats"])
