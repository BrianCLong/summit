# Chronicle Connector

This connector demonstrates basic ingestion of security log data from Google Chronicle.

## How to use

1.  This connector expects log data in a JSON format, representing Chronicle UDM (Unified Data Model) events.
2.  The `schema_mapping.py` script provides a simplified example of how Chronicle UDM events can be mapped to IntelGraph entities (e.g., `Event`, `IPAddress`, `Device`, `Person`, `Domain`, `File`).

## Sample Data

See `sample.json` for a basic example of Chronicle UDM events.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting Chronicle UDM events into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full Chronicle integration.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_chronicle_connector.py`.
