# CSV Connector

This connector allows IntelGraph to ingest data from CSV files.

## How to use

1.  Place your CSV file in a designated input directory.
2.  Ensure your CSV file has columns that can be mapped to IntelGraph entities (e.g., `id`, `name`, `type`, `description`).
3.  The `schema_mapping.py` script defines how CSV rows are transformed into IntelGraph entities.

## Sample Data

See `sample.csv` for an example of the expected CSV format.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting CSV rows into IntelGraph entities. Currently, it supports mapping to `Person` and `Project` entity types based on the 'type' column in the CSV.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_csv_connector.py`.
