"""SDK-compliant CSV connector implementation."""

import csv
import sys
from pathlib import Path
from typing import Any, Dict, Iterator, List

# Add SDK to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sdk.base import BaseConnector


class CSVConnector(BaseConnector):
    """
    CSV file connector implementing the IntelGraph Connector SDK.

    Features:
    - Automatic PII detection and redaction
    - License enforcement
    - Rate limiting
    - Lineage tracking
    """

    def __init__(self, manifest_path: str, csv_file_path: str = None):
        super().__init__(manifest_path)
        self.csv_file_path = (
            csv_file_path
            or self.connector_dir / self.manifest.get("sample_data_file", "sample.csv")
        )

        # Get CSV config from manifest
        self.config = self.manifest.get("configuration", {})
        self.delimiter = self.config.get("delimiter", ",")
        self.encoding = self.config.get("encoding", "utf-8")
        self.skip_header = self.config.get("skip_header", True)
        self.batch_size = self.config.get("batch_size", 1000)

    def fetch_raw_data(self) -> Iterator[Dict[str, Any]]:
        """
        Fetch rows from CSV file.

        Yields:
            Dict representing each CSV row
        """
        with open(self.csv_file_path, encoding=self.encoding) as csvfile:
            reader = csv.DictReader(csvfile, delimiter=self.delimiter)

            for i, row in enumerate(reader):
                # Batch processing with rate limiting
                if i > 0 and i % self.batch_size == 0:
                    print(f"Processed {i} rows...")

                yield row

    def map_to_entities(self, raw_data: Dict[str, Any]) -> tuple[List[Dict], List[Dict]]:
        """
        Map CSV row to IntelGraph entities.

        Args:
            raw_data: CSV row as dict

        Returns:
            (entities, relationships)
        """
        entities = []
        relationships = []

        # Determine entity type from row
        entity_type = raw_data.get("type", "Entity")

        # Create entity
        entity = {
            "type": entity_type,
            "properties": {
                "id": raw_data.get("id"),
                "name": raw_data.get("name"),
                "description": raw_data.get("description", ""),
                # Include all fields from CSV
                **{k: v for k, v in raw_data.items() if k not in ["id", "name", "type"]},
            },
        }

        entities.append(entity)

        # Could extract relationships from CSV if there are linking columns
        # For now, returning empty relationships list

        return entities, relationships


def main():
    """Example usage of CSV connector."""
    import json

    # Path to manifest
    manifest_path = Path(__file__).parent / "manifest.yaml"

    # Create connector
    connector = CSVConnector(str(manifest_path))

    # Print connector info
    print("=== CSV Connector Info ===")
    print(json.dumps(connector.get_connector_info(), indent=2))

    # Run ingestion
    print("\n=== Running Ingestion ===")
    results = connector.run()

    # Print results
    print("\n=== Ingestion Results ===")
    print(f"Records processed: {results['stats']['records_processed']}")
    print(f"Records succeeded: {results['stats']['records_succeeded']}")
    print(f"Records failed: {results['stats']['records_failed']}")
    print(f"Duration: {results['stats'].get('duration_seconds', 0):.2f}s")

    # Print PII report
    if results.get("pii_report"):
        print("\n=== PII Detection Report ===")
        print(json.dumps(results["pii_report"], indent=2))

    # Print license report
    if results.get("license_report"):
        print("\n=== License Report ===")
        print(json.dumps(results["license_report"], indent=2))

    # Print first few results
    print("\n=== Sample Results ===")
    for i, result in enumerate(results["results"][:3]):
        print(f"\nResult {i+1}:")
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
