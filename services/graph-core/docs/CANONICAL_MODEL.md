# Graph Core Canonical Model

This document describes the canonical data model for the IntelGraph platform's Graph Core service.

## Overview

The canonical model provides a standardized schema for all entities and relationships in the intelligence graph, including:

- **21 Entity Types** covering the intelligence domain
- **30 Relationship Types** covering all relationship patterns
- **Bitemporal Support** for time-travel queries
- **Policy Labels** for governance and access control
- **Provenance Tracking** for data lineage

## Entity Types

| Type | Description |
|------|-------------|
| Person | Individual human beings |
| Organization | Companies, agencies, groups |
| Asset | Physical or digital assets |
| Account | Financial or system accounts |
| Location | Physical places and coordinates |
| Event | Temporal occurrences |
| Document | Files, reports, media |
| Communication | Messages, calls, emails |
| Device | Hardware, phones, computers |
| Vehicle | Cars, boats, aircraft |
| Infrastructure | Buildings, networks, facilities |
| FinancialInstrument | Stocks, bonds, crypto |
| Indicator | Threat indicators, IoCs |
| Claim | Assertions, allegations |
| Case | Investigations, matters |
| Narrative | Stories, storylines |
| Campaign | Coordinated activities |
| InfrastructureService | Cloud services, APIs |
| Sensor | IoT devices, monitoring |
| Runbook | Operational procedures |
| Authority | Legal entities, regulators |
| License | Permits, certifications |

## Relationship Types

### Structure (7)
- `CONNECTED_TO` - General connection
- `OWNS` - Ownership relationship
- `WORKS_FOR` - Employment
- `LOCATED_AT` - Physical location
- `MEMBER_OF` - Group membership
- `MANAGES` - Management relationship
- `REPORTS_TO` - Reporting hierarchy

### Network (4)
- `COMMUNICATES_WITH` - Communication
- `TRANSACTED_WITH` - Financial/business transactions
- `SIMILAR_TO` - Similarity relationship
- `RELATED_TO` - General relation

### Hierarchy (3)
- `SUBSIDIARY_OF` - Corporate hierarchy
- `PARTNER_OF` - Partnership
- `COMPETITOR_OF` - Competition

### Actions (4)
- `ACCESSED` - Access to resource
- `CREATED` - Creation relationship
- `MODIFIED` - Modification
- `MENTIONS` - Reference/mention

### Evidence & Provenance (4)
- `SUPPORTS` - Evidence supporting claim
- `CONTRADICTS` - Evidence contradicting claim
- `DERIVED_FROM` - Data derivation
- `CITES` - Citation relationship

### Authority & Governance (3)
- `AUTHORIZED_BY` - Authorization source
- `GOVERNED_BY` - Governance relationship
- `REQUIRES` - Requirement relationship

### Temporal Sequences (3)
- `PRECEDES` - Before in time
- `FOLLOWS` - After in time
- `CONCURRENT_WITH` - Same time

### Hypothesis (3)
- `EXPLAINS` - Explanation relationship
- `ALTERNATIVE_TO` - Alternative hypothesis
- `REFUTES` - Refutation

## Policy Labels

Every entity and relationship **must** have all 7 policy labels:

```typescript
interface PolicyLabels {
  origin: string;              // Source attribution
  sensitivity: SensitivityLevel; // PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED | TOP_SECRET
  clearance: ClearanceLevel;   // PUBLIC | AUTHORIZED | CONFIDENTIAL | SECRET | TOP_SECRET
  legalBasis: string;          // Legal authority (required if sensitivity > INTERNAL)
  needToKnow: string[];        // Compartmentation tags
  purposeLimitation: string[]; // Allowable uses
  retentionClass: RetentionClass; // TRANSIENT | SHORT_TERM | MEDIUM_TERM | LONG_TERM | PERMANENT | LEGAL_HOLD
}
```

### Validation Rules

1. `origin` - Required, non-empty string
2. `sensitivity` - Required, valid enum value
3. `clearance` - Required, valid enum value
4. `legalBasis` - **Required and non-empty** when sensitivity > INTERNAL
5. `needToKnow` - Required array (can be empty)
6. `purposeLimitation` - Required array (can be empty)
7. `retentionClass` - Required, valid enum value

## Bitemporal Support

All entities and relationships support bitemporal queries with two time dimensions:

### Business Time
- `validFrom` - When the fact became true in reality (null = always)
- `validTo` - When the fact stopped being true (null = still valid)

### System Time
- `observedAt` - When we observed/discovered the fact
- `recordedAt` - When we recorded it in the system (immutable)

### Example: Time-Travel Query

```graphql
# Get entity as it was on 2021-06-01
query {
  entityAt(id: "...", asOf: "2021-06-01T00:00:00Z") {
    id
    label
    validFrom
    validTo
    recordedAt
  }
}
```

## GraphQL API

### Queries

| Query | Description |
|-------|-------------|
| `entity(id)` | Get entity by ID |
| `entityAt(id, asOf)` | Get entity at specific time |
| `entityVersions(id)` | Get all versions of an entity |
| `entities(filter, pagination)` | List entities with filtering |
| `relationship(id)` | Get relationship by ID |
| `relationships(filter, pagination)` | List relationships |
| `snapshot(asOf)` | Get graph snapshot at time |
| `neighborhood(query)` | Traverse neighborhood with filters |

### Mutations

| Mutation | Description |
|----------|-------------|
| `upsertEntity(input)` | Create or update entity |
| `upsertRelationship(input)` | Create or update relationship |
| `deleteEntity(id)` | Soft delete entity |
| `deleteRelationship(id)` | Soft delete relationship |
| `updateEntityPolicyLabels(id, labels)` | Update policy labels |

### Example: Create Entity

```graphql
mutation {
  upsertEntity(input: {
    entityType: Person
    label: "John Doe"
    properties: { firstName: "John", lastName: "Doe" }
    confidence: 0.95
    source: "hr-system"
    policyLabels: {
      origin: "hr-connector"
      sensitivity: INTERNAL
      clearance: AUTHORIZED
      legalBasis: ""
      needToKnow: []
      purposeLimitation: ["HR_ANALYSIS"]
      retentionClass: MEDIUM_TERM
    }
    validFrom: "2020-01-15T00:00:00Z"
  }) {
    id
    version
    recordedAt
  }
}
```

### Example: Neighborhood Query

```graphql
query {
  neighborhood(query: {
    entityId: "..."
    depth: 2
    entityTypes: [Person, Organization]
    relationshipTypes: [WORKS_FOR, OWNS]
    minConfidence: 0.7
    temporal: {
      asOf: "2021-06-01T00:00:00Z"
    }
    pagination: {
      limit: 50
    }
  }) {
    center { id label }
    totalEntities
    totalRelationships
    truncated
    cost {
      estimatedNodes
      estimatedEdges
      exceedsLimit
    }
  }
}
```

## REST API

The service also exposes REST endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/entities/:type` | POST | Create/update entity |
| `/api/v1/relationships` | POST | Create/update relationship |
| `/api/v1/query/cypher` | POST | Execute Cypher query |
| `/api/v1/er/*` | * | Entity resolution endpoints |

## Query Cost Limits

To prevent expensive queries, the following limits are enforced:

| Limit | Value |
|-------|-------|
| MAX_NODES | 10,000 |
| MAX_EDGES | 50,000 |
| MAX_DEPTH | 5 |
| MAX_RESULTS | 1,000 |
| TIMEOUT_MS | 30,000 |

Queries exceeding these limits will be truncated and flagged.

## TypeScript Usage

```typescript
import {
  CanonicalEntityType,
  CanonicalRelationshipType,
  SensitivityLevel,
  ClearanceLevel,
  RetentionClass,
  validateEntityInput,
  validatePolicyLabels,
} from 'graph-core-service/canonical';

// Validate entity input
const result = validateEntityInput({
  entityType: CanonicalEntityType.PERSON,
  label: 'John Doe',
  policyLabels: {
    origin: 'test',
    sensitivity: SensitivityLevel.INTERNAL,
    clearance: ClearanceLevel.AUTHORIZED,
    legalBasis: '',
    needToKnow: [],
    purposeLimitation: [],
    retentionClass: RetentionClass.MEDIUM_TERM,
  },
});

if (result.success) {
  console.log('Valid entity:', result.data);
} else {
  console.error('Validation errors:', result.error);
}
```

## Integration Notes

### For Other Services

- Import types from `graph-core-service/canonical`
- GraphQL schema available at `graph-core-service/src/graphql/schema.graphql`
- Do not call graph-core from ingestion/AI/provenance services directly
- Use the GraphQL/REST API for all interactions

### Schema Versioning

The schema follows semantic versioning. Breaking changes will increment the major version. Check the schema registry for version history and changelogs.

## Contact

For questions about the canonical model, contact the Graph Core team.
