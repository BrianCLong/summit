# Repo Assumptions & Validation (Moltbook AI-Theater Pack)

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `docs/` | `docs/` | ✅ Exists | Documentation tree for standards, security, and runbooks. |
| `docs/standards/` | `docs/standards/` | ✅ Exists | Standards catalog (target for interop spec). |
| `docs/security/` | `docs/security/` | ✅ Exists | Security governance and data-handling guidance. |
| `docs/ops/` | `docs/ops/` | ✅ Exists | Operational runbooks and readiness guides. |
| `artifacts/` | `artifacts/` | ✅ Exists | Artifact storage (evidence bundles, agent runs). |
| `.github/workflows/` | `.github/workflows/` | ✅ Exists | CI workflows (reusable + workflow entrypoints). |
| `cli/` | `cli/` | ✅ Exists | CLI workspace with `summit` binary entry. |

## CLI Entry Points

| Planned CLI | Actual Entry | Status | Notes |
| --- | --- | --- | --- |
| `summit` | `cli/package.json` `bin.summit` → `dist/summit.js` | ✅ Verified | `summit` CLI is registered alongside `intelgraph` and `ig`. |

## Artifact & Evidence Conventions

| Planned Artifact | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `artifacts/<slug>/report.json` | `artifacts/` | ✅ Verified | Artifact root exists; deterministic JSON expected. |
| `artifacts/<slug>/metrics.json` | `artifacts/` | ✅ Verified | Metrics bundles stored in artifacts. |
| `artifacts/<slug>/stamp.json` | `artifacts/` | ✅ Verified | Stamp bundles stored in artifacts. |
| Evidence bundle spec | `docs/evidence-bundle-spec.md` | ✅ Verified | Evidence bundle format and expectations. |

## CI Gate Discovery

| Requirement | Actual Location | Status | Notes |
| --- | --- | --- | --- |
| Required checks | `.github/required-checks.yml` | ✅ Verified | Required checks enumerated for branch protection. |
| CI workflows | `.github/workflows/` | ✅ Verified | Reusable CI workflows present. |

## Must-Not-Touch Files (Policy/Release/Lock)

* `pnpm-lock.yaml` (dependency lock)
* `Cargo.lock` (Rust lock)
* `CHANGELOG.md` / release notes files (release governance)
* `LICENSE`, `NOTICE`, `NOTICE.third_party.md` (license governance)
* `.github/required-checks.yml` (branch protection)
* `agent-contract.json` (governance contract)

## Deferred Pending Verification

* Evidence JSON schema paths for evaluation profiles (confirm in `eval/` or `evidence/`).
* Deterministic artifact normalization script location (search in `scripts/ci` or `scripts/evidence`).
* Existing evaluation profile registry (if present under `eval/` or `scripts/`).

## Notes

This repo already registers a `summit` CLI entry and contains artifact/evidence infrastructure. New work should align to `docs/evidence-bundle-spec.md` and existing CI required checks without modifying protection rules.
