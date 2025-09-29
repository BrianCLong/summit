# Sprint Overview

**Sprint Goal:** Ship a verifiable vertical slice—Provenance & Claim Ledger (beta) + NL→Cypher Copilot + ER service stub + SLO/Cost Guard + tri-pane UI integration—meeting near-term GA criteria.

**Duration:** 10 working days (two consecutive Monday–Friday weeks)

## Success Metrics

- p95 graph query latency < 1.5s on the seeded dataset.
- NL→Cypher syntactic validity ≥95% across the curated corpus (includes sandbox & undo/redo coverage).
- Provenance ledger external verification passes on golden fixtures.
- Entity Resolution service merges remain reproducible and explainable via `/er/explain`.
- Tri-pane UI demonstrably reduces time-to-path discovery relative to the baseline benchmark.

## Out of Scope

- Federated multi-graph search.
- Full Graph-XAI dashboards.
- Advanced deception lab scenarios.
