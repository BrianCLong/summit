DOCTRINE_LOCKED = true

# Narrative Invariants

These invariants define the language spine of Summit's counter-intelligence posture. They must remain stable to prevent semantic drift.

## Core Assertions

- Evidence precedes action: no critical decision is taken without linked evidence IDs and confidence bounds.
- Authority is explicit: every decision call carries a named human authority context.
- Information is admissible before use: expired, unattributed, or revoked facts are blocked at intake.
- Refusal is a first-class outcome: the system must be able to deny requests and emit evidence of refusal.

## Stability Rules

- Wording of invariants may only change via the amendment process.
- CI and runtime checks should reference these invariants by section title to ensure traceability.

## Non-Bypassable Expectations

- Automation cannot override these invariants without human authorization recorded in the provenance ledger.
- Any detected weakening (e.g., softening authority language or lowering evidence thresholds) must be flagged as drift.
