# Finance Posting Idempotency Keys

This document describes how finance posting requests derive deterministic idempotency keys so retries are safe and duplicate ledger batches are avoided.

## Design goals

- **Deterministic**: The same receipt payload always yields the same key.
- **Collision-resistant**: Material changes to receipt content or rule versions change the key.
- **Portable**: No database dependencies; works in stateless jobs.
- **Auditable**: Canonical snapshots can be persisted for evidence.

## Key derivation

1. If a `receiptHash` is present, the key is derived solely from `{ ruleVersion, receiptHash }`.
2. Otherwise, the canonical snapshot includes:
   - `ruleVersion` (required)
   - `receiptId` (optional)
   - `occurredAt` (required unless `receiptHash` is provided)
   - `currency` (required unless `receiptHash` is provided)
   - `totalMinor` (required unless `receiptHash` is provided)
   - `paymentMethod` (lowercased for stability)
   - `merchantId`
   - `lineItems` (sorted by SKU, description, amount, then quantity)
   - `attributes` (key-sorted)
3. The canonical snapshot is serialized with a stable, key-sorted JSON representation and hashed with SHA-256.
4. The final idempotency key is prefixed with `posting_`.

## Usage guidance

- Always provide `ruleVersion` and either `receiptHash` **or** the trio of `occurredAt`, `currency`, and `totalMinor`.
- Persist the canonical snapshot emitted by `snapshotForKey` for offline reconciliation and evidence.
- When rules change, bump `ruleVersion` to intentionally create a new key and avoid reusing stale postings.
- For bulk replay flows, compute the key before invoking posting logic to short-circuit already processed receipts.

## Example

```ts
import { derivePostingKey } from "server/src/finance/idempotency/postingKey";

const key = derivePostingKey({
  ruleVersion: "v1.0.0",
  receiptId: "rcpt_123",
  occurredAt: "2025-01-15T12:00:00.000Z",
  currency: "USD",
  totalMinor: 1299,
  receiptHash: "optional-hash-if-precomputed",
});
// => posting_7b8c... (deterministic)
```

## Non-goals / Out of scope

- Database storage or deduplication tables
- Network calls or external hashing services
- Schema migration changes
