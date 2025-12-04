# Complex Event Processing (CEP) Service Blueprint

This document captures the scoped blueprint for a CEP subsystem requested for the platform. It consolidates the runtime model, adapter expectations, API contracts, UI flows, and validation surfaces so implementation can proceed in small, reviewable increments without ambiguity.

## Goals
- Expressive DSL with sequence operators (`AFTER`, `WITHIN`, `EVERY`), tumbling and sliding windows, and watermark-aware timing semantics.
- Pluggable ingestion/egress adapters for Redis streams and Kafka topics while enforcing at-least-once delivery and idempotent emits.
- API surface for rule authoring, dry runs, and execution trace lookup: `POST /rules`, `GET /runs/:id`, `POST /dryrun`.
- UI rule composer with live match preview; chip-style selectors for window and sequence constraints (jQuery compatible).
- Fixtures that cover event sequences, joins, and watermark correctness; soak testing via k6 and end-to-end author→preview→deploy via Playwright.
- Safety requirements: propagate LAC (latest acceptable clock) labels and avoid storing PII payloads at rest.

## Service Layout
```
services/cep/
  go/           # Go runtime skeleton (streams + watermarking core)
  node/         # Node/TypeScript API + UI composition helpers
  docs/         # Architecture notes, threat model, runbooks
  fixtures/     # Event streams, joins, watermark edge cases
  tests/        # Go + Node unit/integration suites, k6 + Playwright specs
```

## DSL Semantics
- **Sequencing**: `A AFTER B` enforces ordered occurrence; `WITHIN <duration>` limits lateness. `EVERY` repeats evaluation for each matching occurrence rather than first-match semantics.
- **Windows**:
  - Tumbling: fixed-size, non-overlapping buckets keyed by event time.
  - Sliding: overlapping window advancing on each event; evaluation occurs per step.
- **Watermarking**: All time-based operations use event-time with watermark advancement; triggers only fire when watermark crosses window end. Rules carry LAC labels to bound acceptable skew.

## Adapters
- **Kafka**: consumer groups with manual commit, replayable offsets, and deterministic partition keying to preserve ordering for correlated sequences.
- **Redis Streams**: consumer groups with explicit ACK after idempotent emit is confirmed; uses XCLAIM for stuck deliveries.
- Emission path must de-duplicate via rule-run IDs or deterministic hashes before acknowledging upstream.

## APIs
- `POST /rules`: registers a DSL rule, validates window/sequence composition, and returns a rule identifier plus LAC label.
- `GET /runs/:id`: fetches run metadata and non-PII diagnostics (window boundaries, watermark progression, adapter offsets).
- `POST /dryrun`: accepts a rule and fixture payload to simulate matches without persisting payload bodies.
- Responses redact payload data; only schema fingerprints and timing metadata are returned.

## UI Composition
- Rule composer should render sequence and window terms as chips; selecting chips updates a live preview by invoking `/dryrun` against fixture streams.
- Live preview highlights matched windows and shows watermark position and LAC per evaluation step.

## Testing Surfaces
- **Fixtures**: deterministic event streams for sequences, joins, and late-arriving data to verify watermark handling.
- **Watermark tests**: ensure late events before watermark are included; late events after watermark are dropped but logged.
- **Soak**: k6 script driving sustained publish/consume to verify at-least-once and idempotent emit behavior.
- **E2E**: Playwright flow covering authoring a rule, previewing via dry run, and deploying to active evaluation.

## Delivery Considerations
- Avoid persisting payload bodies; store hashes and schema fingerprints only.
- Tag downstream emits with LAC labels for lineage and auditability.
- Implement replay protection using rule-run IDs across adapters.
- Prefer schema-first validation for DSL to prevent ambiguous parsing.

## Next Steps
- Establish Go module for watermark core and Node package for API/UI composition.
- Wire adapter interfaces with contract tests using the fixtures catalog.
- Bootstrap CI pipelines for unit, integration, soak, and e2e suites tied to the new service path.
