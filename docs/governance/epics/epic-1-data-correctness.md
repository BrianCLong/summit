Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 1 — Data Correctness & Invariants (GA means “it’s right,” not “it runs”)

1.  Define canonical invariants for Tier-0 objects (uniqueness, ordering, state transitions).
2.  Add server-side validators that enforce invariants at write boundaries.
3.  Implement idempotency keys for all external writes and job submissions.
4.  Add “reconciliation jobs” for critical aggregates (detect + repair drift).
5.  Build a “data diff” tool for before/after deploy verification on sampled tenants.
6.  Add integrity checks in CI for schema changes (constraints, migrations, defaults).
7.  Create a corruption playbook: detect → isolate → repair → attest.
8.  Implement immutable audit trails for Tier-0 state changes (who/what/when).
9.  Add customer-visible “state health” indicators where useful (reduce tickets).
10. Run monthly integrity drills on staging with seeded edge cases.
11. Delete silent failure paths that accept bad data “for now.”
