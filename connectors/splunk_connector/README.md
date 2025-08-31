# Splunk Connector

This connector demonstrates basic ingestion of log data from Splunk.

## How to use

1.  This connector expects log data in a JSON format, similar to what can be exported from Splunk.
2.  The `schema_mapping.py` script provides a simplified example of how Splunk log entries can be mapped to IntelGraph entities (e.g., `Event` and `Device`).

## Sample Data

See `sample.json` for a basic example of Splunk log entries.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting Splunk log data into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full Splunk integration.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_splunk_connector.py`.
