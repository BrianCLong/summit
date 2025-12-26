# RFC 0011: Async Provenance Ingestion

| Status        | Proposed |
| :---          | :--- |
| **Author**    | Jules |
| **Created**   | 2025-10-26 |
| **Updated**   | 2025-10-26 |
| **Problem**   | [Provenance Scalability](2025-Q4-PROBLEM_STATEMENTS.md#2-provenance-ledger-write-throughput--integrity) |

## Context
`ProvenanceLedgerV2` ensures strict ordering and hash-chain integrity by locking and reading the last entry before inserting the next. This synchronous `read-then-write` cycle inside a transaction limits write throughput to ~50-100 writes/second per tenant and adds latency to the client. As we move to "Agentic" workflows where every "thought" is audited, we need >1000 events/sec.

## Options

### Option 1: Buffered Queue & Batch Worker (Recommended)
Clients write events to a fast ingestion queue (Redis List / Kafka). A background worker consumes batches, calculates hash chains in memory for the batch, and performs a single bulk `INSERT`.
- **Pros**: Decouples API latency from DB write speed. High throughput (batches of 100+).
- **Cons**: "Read-your-writes" gap (client can't immediately see the hash). Complexity of a new worker component.
- **Risk**: If the worker crashes, events in queue are delayed (but not lost if queue is durable).

### Option 2: Optimistic Concurrency
Allow parallel inserts with an `expected_previous_hash`. If a conflict occurs (another insert happened), the DB rejects, and the client retries.
- **Pros**: No new infrastructure.
- **Cons**: Under high load, "retry storms" will destroy performance. Unusable for high-concurrency streams.

### Option 3: Sharded Ledger Chains
Split the single "Tenant Chain" into multiple "Stream Chains" (e.g., `Tenant:User:123`, `Tenant:System`).
- **Pros**: Reduces contention lock scope.
- **Cons**: Cross-stream ordering is lost. Global state reconstruction requires complex merging.

## Decision
**Recommend Option 1**. The latency benefit for the "Agent" (client) is critical. The "read-your-writes" delay is acceptable for audit logs.

## Consequences
- New infrastructure: `IngestionQueue` (Redis).
- New component: `ProvenanceWorker`.
- `appendEntry` API changes to return `Accepted` (202) instead of `Created` (201) with full hash.
