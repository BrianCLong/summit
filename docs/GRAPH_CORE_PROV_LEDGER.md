# Graph Core & Provenance Ledger - How to Use

This document describes how to use the IntelGraph "Graph Core" and "Provenance Ledger" services. These services provide a canonical, bitemporal entity model and an immutable audit trail for all data changes.

## Overview

- **Graph Core**: Manages the entity-relationship graph (Neo4j). It enforces bitemporal versioning (`validFrom`, `validTo`) and policy labels.
- **Provenance Ledger**: Records an immutable sequence of events (claims, edits, transformations) in a Merkle-hashed chain (PostgreSQL).

## Canonical Entity Model

All entities share a common base structure:

```typescript
interface BaseCanonicalEntity {
  id: string;
  tenantId: string;
  entityType: string;
  policyLabels: PolicyLabels;
  temporal: {
    validFrom: Date; // Real-world validity start
    validTo: Date | null; // Real-world validity end
    observedAt: Date; // When we learned this
    recordedAt: Date; // When we wrote to DB
  };
}
```

### Supported Entity Types

- **Person**: Individuals, identities.
- **Organization**: Companies, groups.
- **Claim**: Assertions, allegations.
- **Location**, **Asset**, **Event**, **Document**, **Communication**, etc.

### Policy Labels

Every entity mutation **must** include `PolicyLabels` to govern data handling:

```typescript
interface PolicyLabels {
  origin: string; // e.g., "OSINT", "Partner X"
  sensitivity: string; // PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET
  clearance: string; // PUBLIC, AUTHORIZED, CONFIDENTIAL, SECRET, TOP_SECRET
  legalBasis: string; // e.g., "Consent", "Legitimate Interest"
  needToKnow: string[]; // Array of tags/groups
  purposeLimitation: string[]; // e.g., "Analytics", "Security"
  retentionClass: string; // TRANSIENT, LONG_TERM, PERMANENT
}
```

## API Usage

### 1. Creating an Entity (GraphQL)

To create an entity, you must provide the data payload and the policy labels.

```graphql
mutation CreatePerson {
  createCanonicalEntity(
    entityType: PERSON
    data: { name: { full: "John Doe" }, identifiers: { emails: ["john@example.com"] } }
    policyLabels: {
      origin: "Manual Entry"
      sensitivity: INTERNAL
      clearance: AUTHORIZED
      legalBasis: "Business Contract"
      needToKnow: ["HR"]
      purposeLimitation: ["Employee Management"]
      retentionClass: LONG_TERM
    }
  ) {
    id
    temporal {
      validFrom
    }
  }
}
```

### 2. Registering a Claim

Claims are special entities that represent assertions.

```graphql
mutation RegisterClaim {
  registerClaim(
    statement: "Entity A acquired Entity B"
    subjects: { entityId: "org-123", name: "Entity A" }
    sources: { name: "News Article X" }
    policyLabels: {
      origin: "OSINT"
      sensitivity: PUBLIC
      clearance: PUBLIC
      legalBasis: "Public Interest"
      needToKnow: []
      purposeLimitation: ["Market Analysis"]
      retentionClass: PERMANENT
    }
    relatedClaims: [{ claimId: "claim-999", relationship: "SUPPORTS" }]
  ) {
    id
    statement
  }
}
```

### 3. Linking Evidence

You can link evidence (Documents, etc.) to Claims.

```graphql
mutation LinkEvidence {
  linkEvidenceToClaim(
    claimId: "claim-100"
    evidenceId: "doc-555"
    weight: 0.8
    description: "Financial Report Q3"
  )
}
```

### 4. Querying (Time Travel)

You can query the state of an entity as it was at a specific point in time.

```graphql
query GetHistoricalPerson {
  canonicalEntity(
    id: "person-123"
    asOf: "2023-01-01T00:00:00Z" # Optional: Leave empty for current version
  ) {
    ... on Person {
      name
      temporal {
        validFrom
        validTo
      }
    }
  }
}
```

### 5. Provenance & Integrity

To verify the ledger integrity or export a verifiable manifest:

```graphql
query CheckIntegrity {
  verifyLedgerIntegrity {
    valid
    brokenChains
  }
}

query ExportLedger {
  exportLedger(format: "json")
}
```

## Internal Service Usage (TypeScript)

Backend services should use the `GraphCoreService` singleton.

```typescript
import { graphCore } from "@/services/GraphCoreService";

await graphCore.saveEntity("tenant-1", "Person", { name: "Alice" }, policyLabels, "actor-id");
```
