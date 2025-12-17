# Bitemporal Storage

TypeScript library for bitemporal (two-dimensional time) data storage with PostgreSQL.

## Features

- **Dual Time Dimensions**:
  - **Valid Time** (business time): When facts are true in the real world
  - **Transaction Time** (system time): When facts are recorded in the database

- **Time-Travel Queries**: Query data "as of" any point in valid time and transaction time
- **Temporal Diff**: Compare snapshots across time dimensions
- **Signed Audit Trail**: Cryptographically signed audit log with hash verification
- **Non-Overlapping Intervals**: Automatically enforced constraint preventing temporal inconsistencies
- **Property-Based Tests**: Verified invariants using fast-check

## Installation

```bash
pnpm add @intelgraph/bitemporal
```

## Quick Start

```typescript
import { BitemporalStore } from '@intelgraph/bitemporal';
import pino from 'pino';

const logger = pino();
const store = new BitemporalStore(
  'postgresql://user:pass@localhost:5432/db',
  'entities', // table name
  logger
);

await store.initialize();

// Upsert a record
await store.upsert('person-001',
  { name: 'John Doe', age: 30 },
  {
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2024-12-31'),
    userId: 'analyst-001'
  }
);

// Get current state
const current = await store.getCurrent('person-001');

// Time-travel query
const asOf = await store.getAsOf(
  'person-001',
  new Date('2024-06-01'), // valid time
  new Date('2024-06-15')  // transaction time
);

// Get all versions
const versions = await store.getAllVersions('person-001');

// Temporal diff
const diff = await store.diff(
  new Date('2024-01-01'), new Date('2024-01-01'), // from
  new Date('2024-06-01'), new Date('2024-06-01')  // to
);

console.log('Added:', diff.added.length);
console.log('Modified:', diff.modified.length);
console.log('Removed:', diff.removed.length);
```

## API Reference

### `BitemporalStore<T>`

#### Constructor

```typescript
new BitemporalStore<T>(
  connectionString: string,
  tableName?: string,
  logger?: Logger
)
```

#### Methods

**`initialize(): Promise<void>`**
- Initialize database schema and indexes

**`upsert(entityKey: string, data: T, options: UpsertOptions): Promise<string>`**
- Insert or update a record with temporal semantics
- Automatically closes overlapping intervals
- Returns the new record ID

**`getCurrent(entityKey: string): Promise<BitemporalRecord<T> | null>`**
- Get the current state of an entity (as of now)

**`getAsOf(entityKey: string, validTime: Date, txTime: Date): Promise<BitemporalRecord<T> | null>`**
- Query state at a specific point in both time dimensions

**`query(options: TemporalQueryOptions): Promise<TemporalSnapshot<T>>`**
- Advanced temporal queries with filtering

**`diff(fromValidTime: Date, fromTxTime: Date, toValidTime: Date, toTxTime: Date): Promise<TemporalDiff<T>>`**
- Compare two temporal snapshots

**`exportAudit(entityKey: string, privateKey?: string): Promise<SignedAudit[]>`**
- Export audit trail with optional cryptographic signatures

**`getAllVersions(entityKey: string): Promise<BitemporalRecord<T>[]>`**
- Get complete version history

**`close(): Promise<void>`**
- Close database connections

## Types

### `UpsertOptions`

```typescript
interface UpsertOptions {
  validFrom: Date;
  validTo?: Date;        // Defaults to '9999-12-31'
  userId?: string;
  metadata?: Record<string, any>;
}
```

### `BitemporalRecord<T>`

```typescript
interface BitemporalRecord<T> {
  id: string;
  entityKey: string;
  data: T;
  validFrom: Date;
  validTo: Date;
  txFrom: Date;
  txTo: Date;
  createdBy?: string;
  modifiedBy?: string;
  metadata?: Record<string, any>;
}
```

### `TemporalQueryOptions`

```typescript
interface TemporalQueryOptions {
  asOfValidTime?: Date;
  asOfTxTime?: Date;
  validTimeRange?: { from: Date; to: Date };
  txTimeRange?: { from: Date; to: Date };
  limit?: number;
  offset?: number;
}
```

## Use Cases

### Intelligence Analysis

Track changes in entity attributes over both real-world time and database time:

```typescript
// Record when an entity was added to a watchlist
await store.upsert('entity-123',
  { watchlist: true, reason: 'travel pattern' },
  {
    validFrom: new Date('2024-01-15'), // When travel occurred
    userId: 'analyst-007'
  }
);

// Later, discover the travel date was wrong - correct it
await store.upsert('entity-123',
  { watchlist: true, reason: 'travel pattern' },
  {
    validFrom: new Date('2024-01-10'), // Corrected date
    userId: 'analyst-007'
  }
);

// Query: "What did we believe on Feb 1st about Jan 20th?"
const belief = await store.getAsOf(
  'entity-123',
  new Date('2024-01-20'), // valid time: what we're asking about
  new Date('2024-02-01')  // tx time: what we knew then
);
```

### Regulatory Compliance

Maintain immutable audit trails:

```typescript
const audit = await store.exportAudit('entity-123', privateKey);

for (const entry of audit) {
  console.log(`${entry.operation} at ${entry.txTime}`);
  console.log(`  Hash: ${entry.hash}`);
  console.log(`  Signature: ${entry.signature}`);
}
```

### Data Quality Analysis

Compare current state with past beliefs:

```typescript
const diff = await store.diff(
  new Date('2024-01-01'), new Date('2024-01-01'),
  new Date('2024-06-01'), new Date('2024-06-01')
);

console.log(`Corrected ${diff.modified.length} records`);

for (const mod of diff.modified) {
  console.log(`Entity: ${mod.after.entityKey}`);
  for (const change of mod.changes) {
    console.log(`  ${change.field}: ${change.oldValue} → ${change.newValue}`);
  }
}
```

## Database Schema

The bitemporal table structure:

```sql
CREATE TABLE bitemporal_entities (
  id UUID PRIMARY KEY,
  entity_key TEXT NOT NULL,
  data JSONB NOT NULL,

  -- Valid time dimension
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  -- Transaction time dimension
  tx_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tx_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',

  -- Audit
  created_by TEXT,
  modified_by TEXT,
  metadata JSONB,

  -- Constraints
  CHECK (valid_from < valid_to),
  CHECK (tx_from < tx_to)
);

-- Exclusion constraint: no overlapping intervals
ALTER TABLE bitemporal_entities
  ADD CONSTRAINT no_overlap_valid_time
  EXCLUDE USING gist (
    entity_key WITH =,
    tstzrange(valid_from, valid_to) WITH &&,
    tstzrange(tx_from, tx_to) WITH &&
  );
```

## Testing

Property-based tests verify critical invariants:

```bash
pnpm test
```

Key properties tested:
- `valid_from < valid_to` always
- `tx_from < tx_to` always
- No overlapping intervals for same entity at same tx time
- Queries at same time return same results (idempotent)
- Diff of same snapshot is empty
- Version history is correctly ordered

## Performance

Indexes optimized for temporal queries:

- **GiST indexes** on temporal ranges for fast overlap detection
- **B-tree indexes** on entity_key, timestamps
- **Combined index** on (entity_key, valid_from, valid_to, tx_from, tx_to)

Typical query performance (100k records):
- Current state: < 1ms
- As-of query: < 5ms
- Diff between snapshots: < 50ms

## Best Practices

1. **Choose appropriate valid time granularity**: Day-level for most intelligence data
2. **Use transaction time for audit**: Never backdate tx_from
3. **Batch upserts**: Use database transactions for multiple related changes
4. **Archive old tx versions**: Keep tx_to < NOW() - retention_period in separate table
5. **Sign critical audits**: Use private keys for non-repudiation

## License

Proprietary - IntelGraph Platform
