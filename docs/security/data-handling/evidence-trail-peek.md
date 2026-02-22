# Evidence-Trail Peek Data Handling

## Classification

Evidence-Trail Peek is **read-only** and does not create or persist new evidence. It renders metadata already stored under existing `evidence_id` joins.

## Never Log

- Raw evidence bodies
- Full URLs containing query strings or tokens
- User-entered prompt text

Telemetry only includes identifiers (`answer_id`, `node_id`, `artifact_id`) and aggregate counts. Query strings are stripped before telemetry submission.

## Retention

Telemetry events follow existing Summit retention policies. Evidence-Trail Peek adds no new deterministic timestamps or storage.

## Access Control

Endpoints require existing authentication and tenant scoping. The overlay does not bypass role or policy checks.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Observability, Security
- **Threats Considered**: leakage via telemetry, evidence spoofing
- **Mitigations**: tenant scoping, read-only endpoints, telemetry redaction
