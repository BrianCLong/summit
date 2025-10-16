# intelgraph/schema/graph_primitives.py

# This file outlines how time, geo, and policy labels might be integrated
# into the IntelGraph schema and data model.

# 1. Time Primitives:
#    Timestamps for events, observations, or validity periods of entities/relationships.
#    Could be represented as ISO 8601 strings or Unix timestamps.
#    Example properties on entities/relationships:
#    - 'timestamp': '2023-08-25T14:30:00Z'
#    - 'valid_from': '2023-01-01T00:00:00Z'
#    - 'valid_until': '2023-12-31T23:59:59Z'

# 2. Geo Primitives:
#    Geospatial coordinates for locations, events, or assets.
#    Could be represented as latitude/longitude pairs, GeoJSON objects, or WKT.
#    Example properties on 'Location' or 'Event' entities:
#    - 'latitude': 34.0522
#    - 'longitude': -118.2437
#    - 'geojson': { "type": "Point", "coordinates": [-118.2437, 34.0522] }

# 3. Policy Labels:
#    Metadata tags or attributes applied to entities, relationships, or even properties
#    to enforce governance, compliance, and privacy rules.
#    These labels would influence access control (ABAC/RBAC), retention, and usage.
#    Example properties:
#    - 'policy_labels': ['sensitivity:high', 'origin:internal', 'legal_basis:GDPR', 'retention:7years']
#    - 'data_minimization_level': 'redacted'
#    - 'license_id': 'MIT_License_v1'

# Integration Notes:
# - These primitives and labels would typically be part of the data ingestion pipeline,
#   parsed from source data and stored as properties on graph elements.
# - Graph queries and analytics would then leverage these properties for filtering,
#   spatial analysis, temporal analysis, and policy enforcement.
# - The actual enforcement of policy labels would likely involve integration with
#   systems like OPA (Open Policy Agent) as mentioned in the Governance section.
