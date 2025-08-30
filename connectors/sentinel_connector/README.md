# Microsoft Sentinel Connector

This connector demonstrates basic ingestion of security log data from Microsoft Sentinel.

## How to use

1.  This connector expects log data in a JSON format, representing events from Microsoft Sentinel.
2.  The `schema_mapping.py` script provides a simplified example of how Sentinel log entries can be mapped to IntelGraph entities (e.g., `Event`, `Device`, `Person`, `IPAddress`, `Process`).

## Sample Data

See `sample.json` for a basic example of Sentinel log entries.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting Sentinel log data into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full Sentinel integration.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_sentinel_connector.py`.
