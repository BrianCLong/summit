# ADR-0011: Provenance Ledger Schema Design

**Date:** 2024-02-20
**Status:** Accepted
**Area:** Data
**Owner:** Compliance & Data Guilds
**Tags:** provenance, ledger, timescale, audit, lineage

## Context

Summit requires immutable, queryable provenance for:
- **Regulatory compliance**: FDA 21 CFR Part 11, SOC2, FedRAMP audit requirements
- **Data lineage**: Track data transformations, derivations, and dependencies
- **Attribution**: Who created/modified what, when, why, under which authority
- **Reproducibility**: Recreate analysis results from historical state
- **Forensics**: Investigate security incidents, policy violations

Requirements:
- **Immutability**: Write-once, append-only (no updates/deletes)
- **High write throughput**: 10k+ events/second during peak
- **Efficient queries**: Time-range, entity, user, action queries <100ms
- **Retention**: 7+ years for regulated data
- **Compression**: Minimize storage costs for long-term retention
- **Attestation**: Cryptographic proof of event integrity

## Decision

We will use **TimescaleDB** (Postgres extension) for the provenance ledger with a structured event schema.

### Core Decision
Provenance ledger design:
- **TimescaleDB hypertables**: Automatic partitioning by time
- **Event-sourced schema**: Immutable events, never updates
- **Structured events**: JSON payload with standardized envelope
- **Merkle tree**: Periodic commitment hashes for tamper detection
- **Compression**: Automatic compression of old partitions
- **Replication**: Sync to S3 Glacier for long-term retention

Event schema:
```typescript
interface ProvenanceEvent {
  id: uuid;              // Unique event ID
  timestamp: timestamptz; // Event time (indexed, partitioning key)
  tenant_id: string;     // Tenant isolation
  compartment_id: string; // Compartment boundary
  actor: {               // Who performed the action
    user_id: string;
    session_id: string;
    ip_address: string;
  };
  action: string;        // What happened (created, updated, accessed, etc.)
  resource: {            // What was affected
    type: string;        // Entity, Document, Investigation, etc.
    id: string;
    version: number;
  };
  context: {             // Why and how
    authority: string[]; // Applicable authorities
    justification: string;
    parent_event_id?: uuid; // Causal link
  };
  payload: jsonb;        // Event-specific data
  attestation: {         // Cryptographic proof
    hash: string;        // SHA-256 of event
    signature?: string;  // Optional signature
    merkle_root?: string; // Periodic commitment
  };
}
```

### Key Components
- **TimescaleDB**: Time-series optimized Postgres extension
- **Event Writers**: High-throughput event ingestion workers
- **Compression Policy**: Auto-compress partitions >30 days old
- **Retention Policy**: Move to Glacier after 1 year
- **Merkle Commitment**: Periodic hash commitment for tamper detection
- **Query API**: GraphQL and SQL views for provenance queries

## Alternatives Considered

### Alternative 1: EventStoreDB
- **Pros:** Purpose-built event store, projections, subscriptions
- **Cons:** Another database, smaller ecosystem, learning curve
- **Cost/Complexity:** Operational overhead

### Alternative 2: Append-only S3
- **Pros:** Immutable, cheap, infinite scale
- **Cons:** Poor query performance, no indexing, expensive scans
- **Cost/Complexity:** Low cost, terrible DX

### Alternative 3: Amazon QLDB
- **Pros:** Managed ledger, cryptographic verification
- **Cons:** Vendor lock-in, limited query capabilities, immature
- **Cost/Complexity:** Expensive, limited flexibility

## Consequences

### Positive
- TimescaleDB provides time-series optimizations (compression, partitioning)
- Immutable ledger ensures audit trail integrity
- Fast time-range queries for compliance reports
- Postgres tooling (backup, monitoring, SQL) already familiar
- Merkle commitments enable tamper detection

### Negative
- Write-only model means correcting errors requires new compensating events
- Storage grows continuously (mitigated by compression + Glacier)
- TimescaleDB adds operational complexity to Postgres
- Merkle commitment computation adds overhead

### Operational Impact
- **Monitoring**: Track write throughput, partition size, compression ratio
- **Compliance**: Regular Merkle root attestation, archive to immutable storage
- **Performance**: Tune chunk intervals, compression policies, retention policies

## Code References

### Core Implementation
- `packages/prov-ledger/src/` - Provenance ledger service
- `prov-ledger-service/src/` - Standalone provenance service
- `server/src/db/timescale.ts` - TimescaleDB initialization
- `server/src/services/ProvenanceService.ts` - Provenance event writing

### Data Models
- `server/src/db/schema/provenance.ts` - Provenance event schema
- `server/src/db/migrations/XXX-timescale-hypertable.sql` - Hypertable creation

### Query APIs
- `server/src/graphql/schema/provenance.graphql` - Provenance query schema
- `packages/prov-ledger/src/cli.ts` - CLI for provenance queries

## Tests & Validation

### Unit Tests
- `packages/prov-ledger/tests/events.test.ts` - Event serialization
- Expected coverage: 90%+

### Integration Tests
- `tests/integration/provenance/write.test.ts` - High-throughput writes
- `tests/integration/provenance/queries.test.ts` - Time-range, entity queries
- `tests/integration/provenance/merkle.test.ts` - Commitment verification

### Performance Tests
- Target: 10k+ events/second sustained write throughput
- Target: <100ms p95 for time-range queries

### CI Enforcement
- `.github/workflows/provenance-ledger.yml` - Provenance tests on PR

## References

### Related ADRs
- ADR-0008: Authority Compiler (provenance tracks authority decisions)
- ADR-0010: Multi-Tenant Compartment (provenance respects compartment boundaries)
- ADR-0005: Disclosure Packager (bundles provenance for auditors)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-02-20 | Compliance Guild | Initial version |
