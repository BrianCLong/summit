"""SDK-compliant Parquet connector implementation."""

import sys
from pathlib import Path
from typing import Any, Dict, Iterator, List

# Add SDK to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sdk.base import BaseConnector


class ParquetConnector(BaseConnector):
    """
    Parquet file connector implementing the IntelGraph Connector SDK.

    Features:
    - Automatic PII detection and redaction
    - License enforcement
    - Rate limiting
    - Lineage tracking
    - Columnar data handling
    - Schema validation
    """

    def __init__(self, manifest_path: str, parquet_file_path: str = None):
        super().__init__(manifest_path)
        self.parquet_file_path = (
            parquet_file_path
            or self.connector_dir / self.manifest.get("sample_data_file", "sample.parquet")
        )

        # Get Parquet config from manifest
        self.config = self.manifest.get("configuration", {})
        self.batch_size = self.config.get("batch_size", 1000)
        self.columns = self.config.get("columns")  # Specific columns to read
        self.filters = self.config.get("filters")  # Row filters

    def fetch_raw_data(self) -> Iterator[Dict[str, Any]]:
        """
        Fetch rows from Parquet file.

        Yields:
            Dict representing each row
        """
        try:
            import pyarrow.parquet as pq
        except ImportError:
            raise ImportError(
                "pyarrow is required for Parquet support. Install with: pip install pyarrow"
            )

        # Open Parquet file
        parquet_file = pq.ParquetFile(str(self.parquet_file_path))

        # Read in batches for memory efficiency
        for batch in parquet_file.iter_batches(batch_size=self.batch_size, columns=self.columns):
            # Convert batch to list of dicts
            df = batch.to_pandas()

            for i, row in df.iterrows():
                # Convert row to dict, handling NaN values
                row_dict = row.to_dict()

                # Replace NaN with None
                row_dict = {k: (None if isinstance(v, float) and v != v else v) for k, v in row_dict.items()}

                yield row_dict

    def map_to_entities(self, raw_data: Dict[str, Any]) -> tuple[List[Dict], List[Dict]]:
        """
        Map Parquet row to IntelGraph entities.

        Args:
            raw_data: Parquet row as dict

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
                # Include all fields from Parquet
                **{k: v for k, v in raw_data.items() if k not in ["id", "name", "type"]},
            },
        }

        entities.append(entity)

        # Could extract relationships from Parquet if there are linking columns
        # For now, returning empty relationships list

        return entities, relationships


def main():
    """Example usage of Parquet connector."""
    import json

    # Path to manifest
    manifest_path = Path(__file__).parent / "manifest.yaml"

    # Create connector
    connector = ParquetConnector(str(manifest_path))

    # Print connector info
    print("=== Parquet Connector Info ===")
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
