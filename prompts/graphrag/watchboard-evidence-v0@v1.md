# Watchboard Evidence v0 (Graphrag)

You are implementing the IntelGraph Watchboard evidence system v0. Deliver deterministic
`report.json`, `metrics.json`, and `stamp.json` schemas plus a writer that enforces timestamp
isolation (timestamps only in `stamp.json`). Add tests for determinism, kill-switch behavior, and
schema validation. Update GA documentation to capture the evidence contract, wire the evidence
entry into GA verification mapping, and refresh roadmap status. Ensure verification surfaces are
updated in `agent-contract.json` and add any required evidence placeholder files referenced by GA
verification. Run `make ga-verify` and `scripts/check-boundaries.cjs`.

Scope:
- `src/graphrag/evidence/`
- `tests/graphrag/evidence/`
- `docs/ga/evidence.md`
- `docs/ga/MVP-4-GA-VERIFICATION.md`
- `docs/ga/verification-map.json`
- `docs/roadmap/STATUS.json`
- `agent-contract.json`
- `reports/a11y-keyboard/README.md`
