# ADR 0003: Invariant-Carrying Context Capsules (IC³)

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long

## Context

Certain context segments must satisfy invariants (policy clauses, safety constraints, schema requirements). We need a reusable capsule abstraction that groups segments and validates invariants before the context is exposed to downstream execution.

## Decision

Create capsules that wrap context segments with invariant definitions and expose validation helpers. Capsules can isolate failing segments for remediation or quarantine prior to assembly.

## Consequences

- **Positive:** Centralizes invariant evaluation and provides structured failure reporting. Supports safety and compliance enforcement earlier in the assembly pipeline.
- **Negative:** Adds validation overhead; invariants require curation and maintenance.
- **Follow-up:** Connect capsule results to policy engines and alerting. Add reusable invariant libraries for schema, safety, and provenance checks.
