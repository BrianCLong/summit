# ESRI Connector

This connector demonstrates basic ingestion of geospatial data from ESRI FeatureSets.

## How to use

1.  This connector expects geospatial data in ESRI FeatureSet JSON format, specifically with Point geometries.
2.  The `schema_mapping.py` script provides a simplified example of how ESRI Point features can be mapped to IntelGraph `Location` entities.

## Sample Data

See `sample.json` for a basic example of ESRI FeatureSet data.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting ESRI FeatureSet data into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full ESRI integration.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_esri_connector.py`.
