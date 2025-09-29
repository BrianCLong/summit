# Sprint 26 Plan

## Scope
- Harden publisher pipeline to SLSA-4 with in-toto attestations and dual-signing.
- Ship ZK Differential Privacy Proof Kit with `k`-anonymity, epsilon budget and no row export proofs.
- Introduce Publisher Reputation Graph and auto-unlisting policies.

## Timeline
- Duration: two weeks following Sprint 25.
- Freeze 48h before demo.

## Definition of Done
- `make sprint26` passes.
- All new docs and dashboards built.
- CI verifies SLSA provenance and ZK proofs.
- Reputation sorting active in marketplace UI.

## Acceptance Criteria
- External publisher runs require valid ZK proof bundles.
- All publisher submissions include SLSA-4 provenance.
- Reputation scores drive marketplace ranking and trigger auto-unlist on three violations within 30 days.
