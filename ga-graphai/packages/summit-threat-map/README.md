# summit-threat-map V2

Threat map service scaffold for:

- Shodan Streaming API newline-JSON ingestion
- Shadowserver Reports API HMAC ingestion
- append-only `threat_event` writes
- H3 cell risk rollups (1m/5m buckets)
- tile + drilldown endpoints
- Mapbox GL JS rendering component with evidence side panel

## Endpoints

- `GET /tiles/:z/:x/:y.mvt?bucket=1m|5m&from=ISO&to=ISO`
- `GET /cell/:h3?from=ISO&to=ISO&limit=100`

Default mode is aggregate-only. Asset/facility point output is intentionally constrained.
