# Repo Assumptions — MCP Apps Subsumption Bundle

## Verified (from prior project context)
- Deterministic evidence artifacts are required: report.json, metrics.json, stamp.json separated.
- CI has existing scripts/ci verifiers and governance enforcement.

## Assumed (validate)
- Node.js 20+ available in CI.
- scripts/ci/*.mjs can run with `node`.
- CI supports adding a new required check job.
- Test runner exists (Jest). If not, we will use node-based fixture tests.

## Must-not-touch (blast radius)
- No refactors across packages/.
- No public API changes.
- Only additive changes under subsumption/, scripts/ci/, docs/, evidence/.
