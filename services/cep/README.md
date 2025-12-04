# Complex Event Processing (CEP) Service

This service provides a DSL-driven rules engine with tumbling and sliding windows, watermarking, and adapters for Redis/Kafka delivery. The runtime intentionally stores only metadata to avoid PII retention and uses idempotent emitters to guarantee at-least-once delivery semantics.

## DSL

Rules are declared with a human-friendly DSL that supports sequencing (`AFTER`), temporal fences (`WITHIN`), periodic evaluation (`EVERY`), and window definitions:

```
EVERY 5s AFTER login WITHIN 30s purchase WINDOW TUMBLING 1m WATERMARK 5s
```

Parsed fields:
- **sequence**: ordered events paired via `AFTER`.
- **within**: deadline for completing the sequence.
- **every**: cadence for periodic scanning.
- **window**: `TUMBLING` or `SLIDING` with durations.
- **watermark**: late-arrival grace.

## API

- `POST /rules` – register a rule and receive a `ruleId` and `runId` for the initial evaluation run.
- `GET /runs/:id` – fetch latest run status, matches, and emitted results.
- `POST /dryrun` – evaluate a rule with provided events without persisting it.

## Adapters

- **Kafka**: produces/consumes events with LAC labels encoded in headers and idempotent producer keys.
- **Redis**: persists dedupe keys and delivers queued emits with acknowledgement tracking.

## Delivery Semantics

- At-least-once is enforced by awaiting broker acknowledgements and retrying with deterministic identifiers.
- Idempotent emits rely on Redis-set keys keyed by `ruleId`+`eventId`.
- Payloads are filtered so only metadata (id, type, timestamp, labels) are stored.

## Testing

Watermark correctness, DSL parsing, and delivery idempotency are covered via Node's built-in test runner under `services/cep/tests`.
