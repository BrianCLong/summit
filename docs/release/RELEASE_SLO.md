# Release SLOs

## Purpose

Define measurable Release SLOs, error budgets, and weekly reporting for release readiness health.
The authoritative configuration lives in `release/RELEASE_SLO.yml` and is validated by
`schemas/release-slo.schema.json`.

## Authority & Alignment

- **Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md`
- **Governance:** `docs/governance/CONSTITUTION.md`
- **Definitions & Targets:** `release/RELEASE_SLO.yml`

## SLO Catalog (v1)

| ID    | SLO                          | Indicator                                    | Window | Target | Alert  |
| ----- | ---------------------------- | -------------------------------------------- | ------ | ------ | ------ |
| SLO-1 | Releasable main availability | % days main is promotable                    | 30d    | 98%    | 95%    |
| SLO-2 | Time-to-green after merge    | Minutes to final required gate success       | 7d     | 45 min | 60 min |
| SLO-3 | Flake rate                   | Rerun/attempt ratio per gate                 | 30d    | 2%     | 4%     |
| SLO-4 | Gate duration budgets        | p50/p95 gate duration                        | 30d    | 30 min | 40 min |
| SLO-5 | Policy drift                 | Soft-gate + branch protection mismatch count | 30d    | 0      | 1      |

## Definitions

- **Releasable main:** Release Train dashboard marks `candidate_type=main` as `promotable_state=success`.
- **Time-to-green:** Minutes between merge commit timestamp and last required gate success for that commit.
- **Flake:** A gate is flaky when it requires multiple runs or attempts before success.
- **Gate duration:** GitHub Actions `run_started_at` to `updated_at` for matched workflows.
- **Policy drift:** Soft-gate violations and branch protection mismatches. This signal is intentionally constrained until governance feeds are wired.

## Data Sources & Evidence

- **Dashboard artifact:** `artifacts/release-train/dashboard.json`
- **Workflow metadata:** GitHub Actions workflow runs filtered by commit SHA
- **Evidence hashes:** SHA-256 computed per dashboard artifact

Outputs are validated against `schemas/release-metrics.schema.json` and sanitized by denylist
redaction. Redaction failures fail closed.

## Storage Approach

**Option A (artifacts-only)** is the default. Metrics and reports are published as workflow
artifacts and regenerated on demand. This avoids persisting long-term sensitive data while
maintaining traceability to signed artifact hashes.

## Weekly Report

The `release-slo-report.yml` workflow publishes:

- `dist/release-metrics/release-metrics.jsonl`
- `dist/release-metrics/release-metrics-summary.json`
- `dist/release-slo/weekly-report.md`
- `dist/release-slo/weekly-report.json`
- `dist/release-slo/charts/*.svg`

Reports highlight regressions (largest negative deltas) and provide deterministic charts without
external trackers.

## Governed Exceptions

Governed exceptions are tracked in `release/RELEASE_SLO.yml` and must include a retirement
condition. Exceptions are treated as assets with explicit remediation timelines.
