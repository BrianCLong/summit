# Entity Resolution (ER) Scorecards

Pluggable entity resolution library with deterministic + probabilistic matching and explainable scorecards.

## Features

- ✅ Deterministic matching (exact email/phone)
- ✅ Probabilistic matching (Levenshtein distance)
- ✅ Explainable scorecards (feature contributions)
- ✅ Threshold-based decisions (MATCH, NO_MATCH, MANUAL_REVIEW)
- ✅ Bitemporal support hooks
- ✅ Audit log integration ready

## Usage

```typescript
import { EntityResolver } from '@intelgraph/entity-resolution';

const resolver = new EntityResolver(0.7); // 70% threshold

const entityA = { id: '1', name: 'Alice Smith', email: 'alice@test.internal' };
const entityB = { id: '2', name: 'Alice Smyth', email: 'alice@test.internal' };

const scorecard = resolver.match(entityA, entityB);

console.log(scorecard);
// {
//   entityA: '1',
//   entityB: '2',
//   overallScore: 0.85,
//   featureScores: { name: 0.88, email: 1.0 },
//   decision: 'MATCH',
//   explanation: ['Name similarity: 88.0%', 'Email match: exact'],
//   threshold: 0.7
// }
```

Each merge decision is tied to lineage hashes for audit trail.

## Entity Resolution Engine

Handles executing versioned ER policies and emitting `MERGE_EVENT` lineage nodes.
