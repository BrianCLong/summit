# Standard: OpenTelemetry + OpenLineage to PROV JSON-LD

## Overview
This standard defines the mapping from OpenTelemetry (OTel) and OpenLineage (OL) attributes to W3C PROV concepts using JSON-LD.

## Mapping Source of Truth
The canonical mapping is defined in `mappings/otel_to_prov.yml`.

## Generated Context
The JSON-LD context is generated at `spec/prov_context.jsonld`.

## Import Matrix
- **OpenLineage**: run/job/dataset identifiers, facets.
- **OTel**: `service.name`, `service.version`, `telemetry.sdk.name`.

## Export Matrix
- JSON-LD context for PROV-aligned terms.
- Canonical N-Quads hashes for auditability.

## Non-Goals
- Full OpenLineage spec coverage.
- Full OTel semantic conventions coverage.
- Runtime lineage emission (CI-only gate in v1).
