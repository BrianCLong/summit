# ADR-0001: Governed Connector SDK

## Status

Accepted

## Context

Summit requires a connector/module fabric that can ingest heterogeneous OSINT sources without allowing schema drift, policy bypass, or non-replayable outputs.

## Decision

Introduce a governed connector SDK with:
- manifest schema
- output schema
- policy references
- deterministic run id
- transform hash
- replay fixtures

## Consequences

### Positive
- stable ingestion contract
- clean future connector onboarding
- replay-safe CI
- strong provenance foundation

### Negative
- extra authoring burden for connector contributors
- initial fixture maintenance overhead

## Follow-ons
- live connector runner
- ontology mapping enforcement
- signed lineage bundles
