# Mapbox Connector

This connector demonstrates basic ingestion of geospatial data from Mapbox, typically in GeoJSON format.

## How to use

1.  This connector expects geospatial data in GeoJSON format, specifically FeatureCollection with Point features.
2.  The `schema_mapping.py` script provides a simplified example of how GeoJSON Point features can be mapped to IntelGraph `Location` entities.

## Sample Data

See `sample.json` for a basic example of GeoJSON data.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting GeoJSON data into IntelGraph entities. This is a simplified mapping for demonstration purposes and would need to be expanded for full geospatial data integration.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_mapbox_connector.py`.
