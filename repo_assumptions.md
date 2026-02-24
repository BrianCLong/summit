# Repo Assumptions & Validation (SpreadsheetBench Verified)

## Readiness assertion

This validation respects the Summit Readiness Assertion and treats unverified paths as intentionally constrained until confirmed.

## Verified vs assumed directory map

| Plan Path | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `docs/` | `docs/` | ✅ Verified | Documentation root exists. |
| `docs/standards/` | `docs/standards/` | ✅ Verified | Standards directory exists. |
| `docs/security/` | `docs/security/` | ✅ Verified | Security documentation root exists. |
| `docs/ops/` | `docs/ops/` | ✅ Verified | Operations documentation root exists. |
| `benchmarks/` | `benchmarks/` | ✅ Verified | Benchmark root exists. |
| `runners/` | `runners/` | Deferred pending verification | Runner directory presence not confirmed. |
| `scripts/` | `scripts/` | ✅ Verified | Scripts root exists. |
| `.github/workflows/` | `.github/workflows/` | ✅ Verified | CI workflows directory exists. |

## Existing CI gates (assumed until confirmed)

* `pr-quality-gate.yml` (referenced in AGENTS guidance).
* `make smoke` golden path target.

## Must-not-touch list (default)

* Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, `Cargo.lock`.
* Release automation: `release-please-config.json`, `release-policy.yml`.
* Security policy baselines and evidence bundles under `docs/ga/`, `docs/governance/`, and `evidence/`.

## Validation checklist (SpreadsheetBench Verified PR1)

1. Confirm benchmark abstraction location (expected: `benchmarks/`).
2. Confirm runner abstraction location (expected: `runners/`).
3. Confirm evidence schema conventions under `evidence/` or `docs/evidence/`.
4. Confirm CI naming for smoke gates.
5. Confirm formatting/lint rules for new documentation in `docs/`.

## Next steps (PR1)

* Add SpreadsheetBench Verified standards and data-handling docs in `docs/`.
* Add a SpreadsheetBench Verified runbook in `docs/ops/runbooks/`.
* Update `docs/roadmap/STATUS.json` with the new initiative.
