# JSON Connector

This connector allows IntelGraph to ingest data from JSON files.

## How to use

1.  Place your JSON file in a designated input directory.
2.  Ensure your JSON file has a structure that can be mapped to IntelGraph entities (e.g., `id`, `name`, `type`, `email`, `status`).
3.  The `schema_mapping.py` script defines how JSON objects are transformed into IntelGraph entities.

## Sample Data

See `sample.json` for an example of the expected JSON format.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting JSON objects into IntelGraph entities. Currently, it supports mapping to `Person` and `Project` entity types.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_json_connector.py`.
