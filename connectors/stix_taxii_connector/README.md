# STIX/TAXII Connector

This connector demonstrates basic ingestion of STIX (Structured Threat Information Expression) data, typically consumed via TAXII (Trusted Automated eXchange of Indicator Information) feeds.

## How to use

1.  This connector is designed to process STIX 2.x bundles.
2.  The `schema_mapping.py` script provides a simplified example of how STIX objects (e.g., Indicators, Malware) can be mapped to IntelGraph entities.

## Sample Data

See `sample.json` for a basic example of a STIX bundle.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting STIX objects into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full STIX support.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_stix_taxii_connector.py`.
