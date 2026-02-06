# Evidence Bundles (Agent Ops Tracing)

## Overview
Evidence bundles provide deterministic, policy-gated artifacts for agent ops
traces. Each bundle is written to `artifacts/evidence/<EVIDENCE_ID>/` and
contains:

- `report.json` (semantic trace summary)
- `metrics.json` (quantitative counters)
- `stamp.json` (timestamp + hashes)
- `evidence/index.json` (manifest of bundle files)

## Determinism Guarantees
- Object keys are sorted before serialization.
- No timestamps are allowed in `report.json` or `metrics.json`.
- Stable IDs are derived from `(sessionId + event index + type)`.

## Retention & Export
- Default retention: 30 days (local).
- Export requires explicit operator command and documented purpose.
- Evidence exports are immutable; corrections require new evidence IDs.

## Audit & Governance
- Bundles are deny-by-default: unknown event types or fields fail verification.
- Secret redaction is enforced at write-time and verified in CI fixtures.
- Governance reviews treat any bypass as a **Governed Exception** with a logged
  rationale.
