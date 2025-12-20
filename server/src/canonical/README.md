# Canonical Entities with Bitemporal Tracking

A comprehensive system for managing entities with full temporal tracking and cryptographic provenance.

## Features

### 🕐 Bitemporal Tracking

Every entity tracks two independent timelines:

- **Valid Time** (`validFrom`/`validTo`): When facts were true in reality
- **Transaction Time** (`observedAt`/`recordedAt`): When facts were recorded in the system

This enables:
- Time-travel queries ("What did we know on date X?")
- Retroactive corrections without losing history
- Complete audit trails
- Legal compliance and forensic analysis

### 🔗 Cryptographic Provenance

Every piece of data includes a provenance chain:

```
Source → Assertion → Transform → Entity
   ↓         ↓           ↓
 Hash     Hash        Hash    → Chain Hash
```

Features:
- SHA-256 hashing of all provenance components
- Tamper detection
- Verifiable audit trails
- Export/import with integrity verification

### 📦 Eight Canonical Entity Types

1. **Person** - Individuals with identifiers, demographics, affiliations
2. **Organization** - Companies, agencies, NGOs with hierarchy
3. **Asset** - Physical/digital assets with ownership tracking
4. **Location** - Places with coordinates, addresses, geometries
5. **Event** - Occurrences with participants, timing, outcomes
6. **Document** - Files, records, evidence with metadata
7. **Claim** - Assertions with verification status
8. **Case** - Investigations with related entities and timeline

## Quick Start

### Creating an Entity

```typescript
import { createPerson, createEntityVersion } from './canonical';
import { getPostgresPool } from './db/postgres';

const pool = getPostgresPool();

const person = createPerson(
  {
    name: { full: 'John Doe', given: 'John', family: 'Doe' },
    identifiers: {
      emails: ['john@example.com'],
    },
    demographics: {
      dateOfBirth: new Date('1990-01-15'),
      nationalities: ['US'],
    },
    classifications: ['pep'],
    metadata: {},
    properties: {},
  },
  {
    id: 'person-123',
    tenantId: 'tenant-1',
    validFrom: new Date('2023-01-01'),
    validTo: null,
    observedAt: new Date('2023-01-01'),
    recordedAt: new Date(),
    version: 1,
    modifiedBy: 'user-456',
    deleted: false,
  },
  'provenance-chain-789',
);

await createEntityVersion(pool, 'Person', person);
```

### Time-Travel Queries

```typescript
import { snapshotAtTime, getEntityHistory } from './canonical';

// Get entities as they were on a specific date
const snapshot = await snapshotAtTime(
  pool,
  'Person',
  'tenant-1',
  new Date('2023-06-15'), // Valid time
  new Date('2023-06-15'), // Transaction time
);

// Get complete history of an entity
const history = await getEntityHistory(
  pool,
  'Person',
  'person-123',
  'tenant-1',
);

console.log(`Entity has ${history.length} versions`);
```

### Provenance Tracking

```typescript
import { createProvenanceChain, verifyChain } from './canonical';

const chain = createProvenanceChain(
  'chain-123',
  {
    sourceId: 'api.example.com/data',
    sourceType: 'rest_api',
    retrievedAt: new Date(),
    sourceMetadata: { apiVersion: '2.0' },
  },
  [
    {
      assertionId: 'assertion-1',
      claim: 'Person exists in source system',
      assertedBy: { type: 'system', identifier: 'import-job' },
      assertedAt: new Date(),
      confidence: 1.0,
      evidence: ['http-response-200'],
    },
  ],
  [
    {
      transformId: 'transform-1',
      transformType: 'normalization',
      algorithm: 'name-normalizer',
      algorithmVersion: '1.0.0',
      inputs: ['raw-data'],
      parameters: { caseStyle: 'title' },
      transformedAt: new Date(),
    },
  ],
);

// Verify integrity
const verification = verifyChain(chain);
console.log(`Chain valid: ${verification.valid}`);
```

### Exporting Subgraphs

```typescript
import { exportSubgraph, validateSubgraphExport } from './canonical';

const subgraph = await exportSubgraph(
  pool,
  {
    tenantId: 'tenant-1',
    rootEntityIds: ['person-123', 'org-456'],
    entityTypes: ['Person', 'Organization', 'Event'],
    maxDepth: 3,
    asOf: new Date(),
  },
  'user-export',
);

// Validate the export
const validation = validateSubgraphExport(subgraph);
console.log(`Export valid: ${validation.valid}`);
console.log(`Total entities: ${subgraph.entities.length}`);
console.log(`Provenance chains: ${subgraph.provenance.chains.length}`);

// Export to JSON
import fs from 'fs';
fs.writeFileSync('export.json', JSON.stringify(subgraph, null, 2));
```

## Sample Queries

See `queryPack.ts` for comprehensive examples:

1. **People as known at date** - Query transaction time
2. **Leadership at specific time** - Query valid time
3. **Change history** - Audit trail
4. **Entities during year** - Time range queries
5. **Case with knowledge gaps** - Combined temporal query
6. **Corrections made** - Retroactive changes
7. **Entity evolution** - State changes over time
8. **Compare snapshots** - Diff between dates

Run all examples:

```typescript
import { demonstrateTimeTravelQueries } from './canonical';

await demonstrateTimeTravelQueries(pool, 'tenant-1');
```

## Database Schema

Run the migration to set up all tables:

```bash
# The migration is in migrations/021_canonical_entities_bitemporal.ts
# It will be automatically run by the migration framework
```

Tables created:
- `canonical_provenance` - Provenance chain storage
- `canonical_person` - Person entities
- `canonical_organization` - Organization entities
- `canonical_asset` - Asset entities
- `canonical_location` - Location entities
- `canonical_event` - Event entities
- `canonical_document` - Document entities
- `canonical_claim` - Claim entities
- `canonical_case` - Case entities

Plus:
- `canonical_entities_current` view
- `get_entity_at_time()` function
- `canonical_metrics` table

## Testing

Run the test suite:

```bash
npm test server/src/tests/canonical
```

Tests cover:
- ✅ Valid time dimension
- ✅ Transaction time dimension
- ✅ Entity history tracking
- ✅ Retroactive corrections
- ✅ Soft deletes
- ✅ Provenance hashing
- ✅ Chain verification
- ✅ Manifest creation
- ✅ Tamper detection
- ✅ End-to-end flows

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  queryPack.ts    │   helpers.ts   │    export.ts          │
│  (Sample Queries) │ (Time Travel)  │ (Subgraph Export)    │
├─────────────────────────────────────────────────────────────┤
│              Entity Schemas (entities/*.ts)                 │
│  Person │ Org │ Asset │ Location │ Event │ Doc │ Claim │ Case │
├─────────────────────────────────────────────────────────────┤
│            Core Types & Provenance (types.ts)               │
│  BitemporalFields │ BaseCanonicalEntity │ ProvenanceChain  │
├─────────────────────────────────────────────────────────────┤
│                   PostgreSQL Database                        │
│           8 Entity Tables + Provenance Table                │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Valid Time vs Transaction Time

**Valid Time** answers: "When was this fact true in the real world?"
- A person started working at a company on Jan 1, 2023
- A document was signed on March 15, 2023
- An asset was acquired on July 1, 2023

**Transaction Time** answers: "When did we learn about this fact?"
- We learned about the employment on Feb 1, 2023 (after it happened)
- We discovered the signature on March 16, 2023 (next day)
- We recorded the acquisition on July 1, 2023 (same day)

### Retroactive Corrections

When you discover that historical data was wrong:

```typescript
// Original: Person named "John Doe" since 2023-01-01
// Correction: Actually named "Jon Doe" (typo)

await correctEntity(
  pool,
  'Person',
  'person-123',
  'tenant-1',
  new Date('2023-01-01'), // Correct from the beginning
  { name: { full: 'Jon Doe' } },
  'user-456',
  'provenance-correction',
);

// Now queries will show:
// - At 2023-01-01 valid time: Jon Doe (corrected)
// - But recorded at current time (when we made the correction)
```

### Provenance Integrity

Every entity links to a provenance chain:

```
Entity → ProvenanceChain → {
  Source (where data came from)
  Assertions (what was claimed)
  Transforms (how data was processed)
}
```

All components are hashed, making tampering detectable:

```typescript
const verification = verifyChain(chain);
if (!verification.valid) {
  console.error('Tampering detected:', verification.errors);
}
```

## Best Practices

1. **Always set both time dimensions**
   - `validFrom`: When the fact became true
   - `recordedAt`: When you're recording it (usually `now()`)

2. **Use corrections, not updates**
   - Don't modify `validFrom` of existing records
   - Use `correctEntity()` to fix historical data

3. **Track provenance**
   - Create provenance chains for all data sources
   - Link entities to their provenance
   - Verify integrity before critical operations

4. **Query appropriately**
   - Use `asOf` for "how things were"
   - Use `asKnownAt` for "what we knew then"
   - Combine both for forensic analysis

5. **Export with manifests**
   - Always include provenance when exporting
   - Validate exports before import
   - Keep manifest signatures for audit

## Performance Considerations

- Indexes on `(valid_from, valid_to)` for temporal queries
- Indexes on `recorded_at` for transaction time queries
- Partial index on current entities (`valid_to IS NULL AND deleted = false`)
- Use `DISTINCT ON` for latest version queries
- Consider partitioning by `tenant_id` for multi-tenant deployments

## Future Enhancements

- [ ] Support for CRDT-based eventual consistency
- [ ] Multi-region bitemporal synchronization
- [ ] Automated provenance chain generation from ETL pipelines
- [ ] GraphQL API with temporal query operators
- [ ] Real-time subscription to entity changes
- [ ] Blockchain anchoring for provenance chains
- [ ] ML-based anomaly detection in temporal data
- [ ] Compliance reporting framework (GDPR, SOX, etc.)

## References

- Snodgrass, R. T. (1999). *Developing Time-Oriented Database Applications in SQL*
- Johnston, T. (2014). *Bitemporal Data: Theory and Practice*
- W3C PROV-O: The PROV Ontology
- ISO 8601: Date and time format

## License

MIT

## Support

For questions or issues, contact the data platform team.
