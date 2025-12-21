# Message Bus Hardening

## Schema Registry & Compatibility
- All topics must register Avro/JSON schemas in the registry; compatibility set to **BACKWARD**.
- Publishing enforced by `tools/security/message-bus/schema-lint.js` which blocks unregistered or breaking schemas.

## Delivery Semantics
- Producers set idempotency keys derived from `tenant_id:event_id`.
- Consumers implement dedupe cache (Redis) with 24h TTL and exponential backoff on retries.
- Dead-letter queue (DLQ) per topic with replay tooling (`tools/security/message-bus/dlq-replay.js`).

## Per-Tenant Throttling
- Quotas defined in `tools/security/message-bus/tenant-quotas.yaml`; enforced via middleware before publish.

## Acceptance Tests
- Breaking schema change is blocked by the compatibility lint.
- Poison message lands in DLQ and is replayed safely (see `test-results/security/dlq-replay-demo.txt`).

## ADR Summary
- Delivery semantics and guarantees captured in `docs/security/message-bus-adr.md` (at-least-once with idempotent consumption).
