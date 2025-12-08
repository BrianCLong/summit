
# Graph Core & Canonical Model

## Overview
This document defines the canonical data model for IntelGraph, including entity types, relationships, temporal semantics, and policy labels.

## Canonical Entity Model
All entities in IntelGraph follow a strict canonical structure ensuring consistency, provenance, and governance.

### Base Fields
Every entity includes:
- `id`: Unique Identifier
- `tenantId`: Tenant Isolation
- `entityType`: Discriminator (Person, Organization, etc.)
- `provenanceId`: Link to the provenance ledger

### Temporal Model
We support **Bitemporality**:
- **Valid Time (`validFrom`, `validTo`)**: When the fact was true in the real world.
- **Transaction Time (`recordedAt`, `observedAt`)**: When the system learned about the fact.

Querying supports **Time Travel**:
- `asOf`: Query the state of valid reality at a specific time.
- `asKnownAt`: Query what the system knew at a specific time.

### Policy Labels
Entities and Edges carry policy metadata for ABAC/OPA enforcement:
- `origin`: Data source
- `sensitivity`: Classification level
- `clearance`: Required clearance
- `legalBasis`: GDPR/Privacy basis
- `needToKnow`: Compartments

## Entity Types
- **Person**: Individuals, targets, sources.
- **Organization**: Companies, groups, government bodies.
- **Asset**: Physical or digital assets.
- **Location**: Geospatial points or regions.
- **Event**: Occurrences in time.
- **Document**: Files, reports, raw text.
- **Claim**: Assertions made by sources.
- **Case**: Investigation containers.
- **Infrastructure**: Devices, Vehicles, Sensors.
- **Financial**: Accounts, Instruments.
- **Intelligence**: Indicators, Campaigns, Narratives.
- **Legal**: Licenses, Authorities (Warrants).

## Extension Rules
1. **Additive Only**: New fields must be optional.
2. **Backward Compatible**: Do not remove existing fields.
3. **Schema First**: Define in `server/src/canonical/entities/` before implementation.
