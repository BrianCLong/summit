# Repository Assumptions for MOSAIC-style Threat Model

| Item | Status | Validation method | Owner |
|---|---|---|---|
| Summit has `server/` TypeScript runtime suitable for isolated module work | verified | inspected `server/package.json` and `server/src` | codex |
| Required checks policy exists and should not be edited in this slice | verified | inspected `docs/ci/REQUIRED_CHECKS_POLICY.yml` path presence | codex |
| Landing zone `server/src/threat_assessment/` minimizes blast radius | assumed | constrained to new subtree only | codex |
| Feature should remain off by default | verified | implemented `SUMMIT_THREAT_ASSESSMENT_ENABLED` default false check | codex |
| Deterministic artifacts can live under `artifacts/threat-assessment/mosaic-threat-model` | assumed | created isolated artifact namespace with stable JSON fields | codex |
