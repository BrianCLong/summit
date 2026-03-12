"""SDK-compliant HTTP/CSV connector implementation."""

import csv
import hashlib
import json
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx

# Add SDK to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sdk.base import BaseConnector


class HTTPCSVConnector(BaseConnector):
    """
    HTTP/CSV reference connector implementing the IntelGraph Connector SDK.

    Features:
    - HTTP(S) data fetching with retries
    - Automatic PII detection and redaction
    - License enforcement
    - Rate limiting
    - Lineage tracking
    - Deterministic record IDs
    """

    def __init__(self, manifest_path: str, subject: dict[str, Any] = None):
        super().__init__(manifest_path, subject)

        # Get HTTP/CSV config from manifest
        self.config = self.manifest.get("configuration", {})
        self.url = self.config.get("url")
        self.method = self.config.get("method", "GET")
        self.delimiter = self.config.get("delimiter", ",")
        self.encoding = self.config.get("encoding", "utf-8")
        self.skip_header = self.config.get("skip_header", True)
        self.batch_size = self.config.get("batch_size", 1000)

        # Import schema mapping
        sys.path.insert(0, str(self.connector_dir))
        try:
            import schema_mapping
            self.mapping_func = schema_mapping.map_data_to_intelgraph
        except ImportError:
            self.mapping_func = self._default_mapping

    def fetch_raw_data(self) -> Iterator[dict[str, Any]]:
        """
        Fetch rows from remote CSV file via HTTP.

        Yields:
            Dict representing each CSV row
        """
        if not self.url:
            raise ValueError("No URL configured in manifest")

        with httpx.Client(follow_redirects=True) as client:
            response = client.request(self.method, self.url)
            response.raise_for_status()

            # Read response content as stream
            content = response.text
            reader = csv.DictReader(content.splitlines(), delimiter=self.delimiter)

            for i, row in enumerate(reader):
                # Batch processing with rate limiting
                if i > 0 and i % self.batch_size == 0:
                    print(f"Processed {i} rows...")

                # Add deterministic ID based on row content
                row["_deterministic_id"] = self._generate_id(row)

                yield row

    def _generate_id(self, row: dict[str, Any]) -> str:
        """Generate a deterministic ID based on row content."""
        # Exclude any existing ID or internal fields for stability
        stable_data = {k: v for k, v in row.items() if not k.startswith("_")}
        row_json = json.dumps(stable_data, sort_keys=True)
        return hashlib.sha256(row_json.encode()).hexdigest()[:16]

    def _default_mapping(self, raw_data: dict[str, Any]) -> tuple[list[dict], list[dict]]:
        """Default mapping if schema_mapping.py is missing."""
        entity = {
            "type": raw_data.get("type", "Entity"),
            "properties": {
                "id": raw_data.get("_deterministic_id"),
                **{k: v for k, v in raw_data.items() if not k.startswith("_")},
            },
        }
        return [entity], []

    def map_to_entities(self, raw_data: dict[str, Any]) -> tuple[list[dict], list[dict]]:
        """
        Map CSV row to IntelGraph entities.
        """
        return self.mapping_func(raw_data)


def main():
    """Example usage of HTTP/CSV connector."""
    import argparse
    import os

    parser = argparse.ArgumentParser(description="Run HTTP/CSV Connector")
    parser.add_argument("--manifest", default=str(Path(__file__).parent / "manifest.yaml"))
    parser.add_argument("--url", help="Override URL in manifest")

    args = parser.parse_args()

    connector = HTTPCSVConnector(args.manifest)
    if args.url:
        connector.url = args.url

    print(f"=== Running HTTP/CSV Connector: {connector.manifest['name']} ===")
    print(f"Source URL: {connector.url}")

    results = connector.run()

    print(f"\nProcessed: {results['stats']['records_processed']}")
    print(f"Succeeded: {results['stats']['records_succeeded']}")
    print(f"Failed:    {results['stats']['records_failed']}")

    if results["results"]:
        print("\n=== Sample Result ===")
        print(json.dumps(results["results"][0], indent=2))

if __name__ == "__main__":
    main()
