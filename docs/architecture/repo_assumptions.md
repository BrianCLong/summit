# Repository Assumptions for `adaptive-tradecraft-graph`

## Readiness & Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance anchors: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`

## Verified (observed in repo)

- **Top-level directories present:** `docs/`, `src/`, `server/`, `apps/`, `packages/`, `services/`, `scripts/`. 
- **Evidence artifacts present:** `EVIDENCE_BUNDLE.manifest.json`, `PROVENANCE_SCHEMA.md`, `docs/ops/EVIDENCE_INDEX.md`.
- **CI workflow inventory present:** `.github/workflows/` with gates including `ci-pr.yml`, `pr-quality-gate.yml`, `ga-gate.yml`, `smoke-gate.yml`, `provenance-gate.yml`, `security_gates.yml`, and `slo-smoke-gate.yml`.

## Deferred Pending Verification

- **KG API surface:** node/edge read/write + snapshot semantics.
- **Evidence normalization conventions:** evidence ID schema, hashing/signing mechanism, and UEF bundle format.
- **Job scheduling:** cron/worker/queue mechanism for scheduled runs.
- **UI architecture:** routing, graph visualization stack, and feature-flag strategy.
- **GraphRAG placement:** no verified `src/graphrag` directory observed; final placement deferred pending local ownership guidance.

## Must-Not-Touch List (Intentionally constrained)

- `node_modules/`
- `archive/`
- `_worktrees/`
- `artifacts/` (evidence outputs only)
- `.github/governance_hashes/` (governance integrity)

## Evidence & Schema Conventions (current signals)

- Evidence bundle manifests are present at the repo root.
- Provenance ledger references exist under `docs/architecture/`.
- Deterministic artifact requirements are documented in `docs/ops/DETERMINISM_EVIDENCE.md`.

## CI Check Names (observed)

- `ci-pr.yml`
- `pr-quality-gate.yml`
- `ga-gate.yml`
- `smoke-gate.yml`
- `provenance-gate.yml`
- `security_gates.yml`
- `slo-smoke-gate.yml`

