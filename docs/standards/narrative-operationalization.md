# Narrative Operationalization Interop — narrative-operationalization

## Summit Readiness Assertion

Summit readiness is asserted per `docs/SUMMIT_READINESS_ASSERTION.md` and this standard is aligned to the same authority files and governed definitions.

## Purpose

Establish deterministic, provenance-rich representations for narrative operationalization signals, including assumption modeling and narrative state transitions, with evidence-first identifiers and stable artifacts for longitudinal analysis.

## Inputs

- Text artifacts (posts, transcripts, documents)
- Quotes and spans with offsets
- Links (canonicalized), thread/post IDs
- Event-time metadata (source-provided only)
- Author/community identifiers (cohort-level only)
- Governance artifacts (policy docs, audit notices)

## Outputs

- Assumption graph edges
- Narrative state transitions
- Metric time series (debt, partition, exhaustion, compression, absorption)
- Alert events (cohort-level only)

## Evidence ID Pattern

`EVD::<source>::<dataset>::<contentHash8>::<spanHash8>`

- `contentHash8`: SHA-256 hash of canonicalized text, truncated to 8 chars.
- `spanHash8`: SHA-256 hash of span offsets (`start:end`), truncated to 8 chars.

## Graph Node Types

- `Narrative`
- `NarrativeArtifact`
- `NarrativeClaim`
- `Assumption`
- `NarrativeState`
- `GovernanceArtifact`

## Deterministic Artifacts

- `metrics.json`: sorted keys and arrays by stable IDs; no timestamps.
- `report.json`: narrative summaries with explicit Evidence IDs.
- `stamp.json`: `{ schemaVersion, codeVersion, inputsHash, paramsHash }` only.

## Import/Export Matrix

| Direction | Records | Notes |
| --- | --- | --- |
| Import | `NarrativeArtifact`, `NarrativeClaim`, `GovernanceArtifact` | Evidence IDs required for every record. |
| Export | `Assumption`, `NarrativeState` | Lineage edges must reference source Evidence IDs. |

## Non-goals

- No truth adjudication or debunking engine.
- No user-level targeting; cohort/community-level analytics only.

## Governance Alignment

All regulatory logic remains policy-as-code and is enforced by the policy engine. This standard is intentionally constrained to deterministic artifacts with explicit Evidence ID linkage.
