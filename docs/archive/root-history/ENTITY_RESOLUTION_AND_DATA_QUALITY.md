# Entity Resolution & Data Quality Service

This document describes the design and operational patterns for the Entity Resolution (ER) and Data Quality service in IntelGraph.

## 1. Overview

The Entity Resolution service is responsible for identifying duplicate entities across heterogeneous data sources and resolving them into a coherent identity graph. It operates with a "zero tolerance for duplicates" philosophy while strictly adhering to governance, provenance, and tenant boundaries.

## 2. Architecture

The service is implemented as a dedicated module in the backend (`server/src/services/entity-resolution/`). It interacts with:

- **Neo4j**: For graph queries and persistence of resolved entities.
- **Provenance Ledger**: To log all merge and link decisions.
- **Ingestion Pipeline**: To trigger resolution on new data.

### Core Components

1.  **Scoring Engine**: Calculates similarity scores between entity pairs based on extracted features (Name, Email, Phone, etc.).
2.  **Resolution Service**: Orchestrates the resolution process, applying thresholds and making decisions (Merge, Link, No Match).
3.  **Merge Executor**: Safely executes merge operations (redirecting edges, tombstoning duplicates) or link operations (`SAME_AS` edges).
4.  **Data Quality Monitor**: Tracks metrics on duplicates, missing fields, and overall graph health.

## 3. Models

### ResolutionCandidate

Represents a pair of entities being compared.

```typescript
interface ResolutionCandidate {
  sourceEntityId: string;
  targetEntityId: string;
  score: number; // 0.0 to 1.0
  features: Record<string, number>; // Feature-specific scores
  reasons: string[]; // Explanations for the score
}
```

### ResolutionDecision

The outcome of a resolution process.

```typescript
type DecisionType = "MERGE" | "LINK" | "NO_MATCH" | "UNRESOLVED";

interface ResolutionDecision {
  candidate: ResolutionCandidate;
  decision: DecisionType;
  confidence: number;
  ruleId?: string; // ID of the rule that triggered the decision
}
```

## 4. Scoring & Thresholds

Scoring is rule-based for v1, using weighted feature matching.

| Feature              | Weight | Description                                   |
| :------------------- | :----- | :-------------------------------------------- |
| **Exact Identifier** | 1.0    | Matches on SSN, UUID, or strict external IDs. |
| **Email**            | 0.9    | Matches on normalized email addresses.        |
| **Phone**            | 0.8    | Matches on normalized phone numbers.          |
| **Name (Fuzzy)**     | 0.6    | Levenshtein/Jaro-Winkler similarity on names. |
| **Geo/Temporal**     | 0.4    | Spatio-temporal overlap.                      |

### Configurable Thresholds (Default)

- **Auto-Merge**: Score >= 0.95 (High confidence, no human review needed).
- **Auto-Link**: Score >= 0.80 (Likely related, add `SAME_AS` edge).
- **Review**: Score >= 0.60 (Potential match, flag for analyst).

## 5. Operations

### Batch Resolution

Processes a set of entities (e.g., from an ingestion batch) against the existing graph.

1.  **Blocking**: Select candidate pairs to avoid N^2 comparisons (e.g., same name initials, same city).
2.  **Scoring**: Compute detailed scores for candidates.
3.  **Decision**: Apply thresholds to determine action.
4.  **Execution**: Apply merges/links transactionally.

### Merge Strategy

- **Hard Merge**: The `source` entity's properties are merged into `target`. Edges connected to `source` are moved to `target`. `source` is marked as merged (tombstoned) or deleted (if policy permits).
- **Soft Link**: A `SAME_AS` relationship is created between `source` and `target`.

### Unmerge

All merges are logged in the Provenance Ledger. An unmerge operation reverses the edge moves and restores the original entity state using the ledger history.

## 6. Data Quality Metrics

The service provides APIs to retrieve quality metrics:

- **Completeness**: % of entities missing critical fields (Name, Type).
- **Uniqueness**: Estimated duplicate rate.
- **Staleness**: % of entities not updated in > X days.

## 7. Guardrails

- **Tenant Isolation**: ER never compares or merges entities across tenants unless explicitly authorized by a cross-tenant agreement.
- **Provenance**: Every merge/link action produces a provenance entry with `actionType: 'ENTITY_MERGE'` or `'ENTITY_LINK'`.
- **Immutable IDs**: Original Entity IDs are preserved in the `previousIds` list of the merged entity to support lookups.
