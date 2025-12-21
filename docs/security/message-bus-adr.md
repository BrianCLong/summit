# ADR: Message Bus Delivery Semantics and Guarantees

## Status
Accepted

## Context
The platform relies on Kafka-compatible brokers for cross-service events. We need stronger correctness under failures and predictable schema evolution.

## Decision
- Enforce schema compatibility as **BACKWARD** to allow safe producer upgrades.
- Use idempotent producers with `enable.idempotence=true` and deterministic keys.
- Consumers implement dedupe cache keyed by `tenant_id:event_id:offset` and commit offsets only after successful processing.
- DLQ is mandatory for every topic, with replay tool to reintroduce sanitized messages.
- Per-tenant quotas prevent noisy-neighbor amplification.

## Consequences
- Slightly higher latency due to dedupe checks, but prevents duplicate side effects.
- Publishing fails fast on schema regressions, surfacing developer errors earlier.
- Replay workflow documented in `docs/security/message-bus-hardening.md` and runbook in `tools/security/message-bus/README.md`.
