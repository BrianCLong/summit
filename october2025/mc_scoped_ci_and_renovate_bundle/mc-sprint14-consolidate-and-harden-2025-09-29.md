# Sprint 14: Consolidate & Harden (post-gap closure)

**Cadence:** 2025-10-14 → 2025-10-27 (14 days)  
**Slug:** `mc-sprint14-consolidate-and-harden-2025-09-29`  
**Generated:** 2025-09-29T00:00:00 America/Denver

## Goal

Stabilize the new wiring from Sprint 13, increase PR throughput with scoped callers, land Renovate, and raise assurance: flaky→0, security evidence attached to releases, and baseline dashboards live.

## Commitments

- **PR Velocity:** 20% reduction in median PR cycle time via scoped CI.
- **Reliability:** Flaky suites → quarantined or fixed; green on main.
- **Security:** SBOM + provenance attached to every release.
- **Sustainability:** Renovate live with grouped updates; weekly lockfile maintenance.

## Swimlanes

### 1) CI/CD Throughput

- [ ] Roll out `ci.scoped-reusable.yml` + callers (apps/services/packages).
- [ ] Add additional callers for `docs/**`, `infra/**` as needed.
- [ ] Concurrency & cache polish; ensure `corepack pnpm` everywhere.

### 2) Security & Supply Chain

- [ ] Gate on SBOM artifact presence; fail if missing on release/tag.
- [ ] Add provenance attestation step to release pipeline; verify cosign signatures.
- [ ] Add OSS scan lane (e.g., `trivy`/`osv-scanner`) with soft-fail → harden later.

### 3) Observability

- [ ] CI duration & failure-rate panels in Grafana; baseline alerts on p95 duration and fail ratio.
- [ ] Synthetic `/healthz` pings for services; publish status summary in PR checks comment.

### 4) DevEx & Testing

- [ ] Precommit hooks (lint-staged) wired; simple-import-sort across TS/JS workspaces.
- [ ] Add **flaky quarantine** tag and job; track over time in dashboard.
- [ ] Typecheck parity: standardize `pnpm -w ts:check` fallback path per package.

### 5) Docs & Governance

- [ ] Update Runbook Cards; link from README badges.
- [ ] CODEOWNERS → review SLAs; branch protections checkup automation.
- [ ] Close-the-loop: add “Gap Sweep” checklist to the end-of-sprint ritual.

## Definition of Done

- Scoped callers live; median PR CI time reduced by ≥20%.
- SBOM + provenance required on release job; artifacts present & verifiable.
- Grafana CI panels visible; alerts configured.
- Quarantined tests tracked; green main sustained for 7 consecutive days.

## Deliverables

- PRs: three caller workflows + reusable workflow; Renovate preset; CI-to-Release hardening.
- Artifacts: dashboard JSONs; policy & security evidence documented.
- Docs: updated README badges, runbooks, and “Gap Sweep” checklist.
