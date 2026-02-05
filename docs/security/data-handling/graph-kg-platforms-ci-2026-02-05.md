# Data Handling — Graph-KG Platforms CI 2026-02-05

## Readiness Assertion

This data-handling profile is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## Classification

- Competitive intel artifacts are **restricted** and must remain evidence-backed.
- Retrieval prompts and raw documents are **never-log**.

## Never-Log List (Minimum)

- Raw prompts and raw retrieved documents.
- Credentials, access tokens, and Bedrock request bodies.
- Full graph node properties for restricted classes.

## Allowed Storage (Bounded)

- Hashes of prompts and documents.
- Bounded excerpts with Evidence IDs.
- Aggregated metrics (latency, cost, accuracy scores).

## Retention

- Bench artifacts follow CI workflow retention defaults (currently 14 days where configured).
- Production telemetry stores aggregates only (counts, latency) without content payloads.

## Redaction Standard

- All logs must use `redactNeverLog` or equivalent redaction policy.
- Redaction is deterministic and does not depend on timestamps.

## MAESTRO Alignment

- **Layers**: Data, Observability, Security
- **Threats Considered**: prompt/data exfiltration, credential leakage
- **Mitigations**: never-log enforcement, redaction, allowlist-only retrieval
