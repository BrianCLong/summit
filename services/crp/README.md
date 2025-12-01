# Consent Revocation Propagator (CRP)

CRP is a deterministic unwind engine that listens for consent revocations and
propagates compensating actions across experiment assignments, feature
materializations, cache tiers, and query routing tables. The service guarantees
that replays are idempotent and offers a reconciliation report to verify the
absence of drift across subscribers.

## Key Concepts

- **Processor** – coordinates propagation across registered systems while
  persisting outcomes to guarantee idempotency.
- **Systems** – integrations implementing the `System` interface. The reference
  implementation ships with in-memory systems for experiments, features,
  caches, and query routing.
- **Repository** – durable store for processed events. The in-memory repository
  is suitable for tests and local development.

## Running Tests

```bash
cd services/crp
go test ./...
```

## Extending

Add new systems by implementing the `System` interface and wiring the instance
into the processor. Persisting results in an external datastore only requires a
custom `Repository` implementation.
