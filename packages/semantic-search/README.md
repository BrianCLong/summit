# @intelgraph/semantic-search

Semantic retrieval package for governed search, ranking, and semantic hardening.

## Semantic Stack Hardening Expansion

This release hardens the semantic stack with **12 patent-candidate innovations**:

1. **Intent-Locked Query Canonicalization** (`ssi-001`)
2. **Governed Prompt-Injection Sentinel** (`ssi-002`)
3. **Evidence-Budgeted Retrieval Envelope** (`ssi-003`)
4. **Ontology-Lifted Query Expansion** (`ssi-004`)
5. **Facet-Contract Enforcement** (`ssi-005`)
6. **Risk-Weighted Confidence Attenuation** (`ssi-006`)
7. **Deterministic Filter Canonical Ordering** (`ssi-007`)
8. **Semantic Diversity Railguard** (`ssi-008`)
9. **Low-Entropy Query Guard** (`ssi-009`)
10. **Governed Exception Trace Tags** (`ssi-010`)
11. **Reciprocal Expansion Deduplicator** (`ssi-011`)
12. **Search Surface Reduction Mode** (`ssi-012`)

## Usage

```ts
import { SearchService, SemanticHardeningStack } from '@intelgraph/semantic-search';

const hardening = new SemanticHardeningStack({
  ontologyExpansions: {
    fraud: ['financial-crime', 'embezzlement'],
    intel: ['intelligence', 'analysis'],
  },
  allowListFacetFields: ['type', 'status', 'domain', 'owner', 'classification'],
  diversityFields: ['domain'],
  maxEvidenceBudget: 30,
});

const service = new SearchService(index, analytics, hardening);
```

## Governance Notes

- Applies controlled query normalization before index execution.
- Enforces facet field contracts through allow-list filtering.
- Restricts retrieval footprint automatically under elevated risk signals.
- Produces deterministic filter ordering for stable query fingerprints.
