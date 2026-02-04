# Decision Record: Shai-Hulud Supply-Chain Subsumption

## Decision

Establish a subsumption bundle scaffold with deterministic evidence artifacts and aligned
standards/runbooks. This aligns with the Summit Readiness Assertion
(docs/SUMMIT_READINESS_ASSERTION.md) and the governance authority files to enforce evidence-first
gates.

## Rationale

- Install-time execution and typosquat payloads require deterministic, auditable controls.
- Evidence index mapping ensures reproducible verification across CI.

## Alternatives Rejected

- Live registry crawling in CI (intentionally constrained for determinism).

## Follow-on Work

- Add bundle verifier and policy gates (Deferred pending required checks discovery).
- Add asset payload heuristics (flagged off by default).
