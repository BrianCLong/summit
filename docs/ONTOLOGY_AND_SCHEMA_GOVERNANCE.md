# Ontology, Vocabulary & Schema Governance

This document describes the governance model for IntelGraph's data structures.

## Overview

The Governance Console provides a centralized registry for defining and evolving the ontology, controlled vocabularies, and schema versions. It ensures that changes are tracked, reviewed, and versioned.

## Models

### Concept
A canonical term with a defined meaning.
- **Term**: The string representation (e.g., "High Risk").
- **Semantic Type**: Category of the concept (e.g., "risk_level").
- **Supersedes/SupersededBy**: Linkage for evolution/renaming.

### Vocabulary
A collection of Concepts versioned together.

### SchemaVersion
A complete definition of the Graph Schema at a point in time.
- **Entities**: Node types (e.g., Person, Organization).
- **Edges**: Relationship types (e.g., EMPLOYED_BY).
- **Status**: DRAFT, APPROVED, ACTIVE, DEPRECATED.

## Workflows

### Change Management
1. **Proposal**: A developer or analyst proposes a change (e.g., adding a field, modifying a vocab).
2. **Impact Analysis**: The system calculates affected downstream services and datasets.
3. **Review**: A Data Steward reviews the proposal.
4. **Approval & Merge**: Once approved, a new Schema Version is created (DRAFT -> ACTIVE).
5. **Deprecation**: Old versions are marked DEPRECATED but remain accessible for historical queries.

## API Usage

### List Schemas
`GET /api/governance/schemas`

### Get Latest Active Schema
`GET /api/governance/schemas/latest`

### Propose Change
`POST /api/governance/changes`
Payload: `{ "title": "...", "proposedChanges": [...] }`

## Integration

Services should consume the schema from the `/api/governance/schemas/latest` endpoint at startup or periodically to ensure they are using valid field definitions.
