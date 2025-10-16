# Sprint 15: Scale & Evidence

**Cadence:** 2025-10-28 → 2025-11-10 (14 days)  
**Slug:** `mc-sprint15-scale-and-evidence-2025-09-29`  
**Generated:** 2025-09-29T00:00:00 America/Denver

## Goal

Scale throughput using scoped CI and Renovate while enforcing release evidence (SBOM+provenance) and lighting up dashboards & alerts.

## Commitments

- **Throughput:** additional 15% PR cycle-time reduction.
- **Evidence:** 100% of tagged releases include SBOM and SLSA attestation.
- **Observability:** Dashboards imported, alerts enabled.

## Swimlanes

### 1) CI/CD

- [ ] Migrate legacy callers to reusable pattern; add `infra/**` and `docs/**` callers.
- [ ] Fine-tune cache scopes; avoid stampedes with concurrency groups.

### 2) Security/Supply Chain

- [ ] Enforce release lane: block tag if SBOM/provenance missing.
- [ ] Add signature verification step (cosign verify-attestation).

### 3) Observability

- [ ] Import `ci_overview.json`, `pr_health.json`, `flaky_tests.json`.
- [ ] Add alert rules: p95 duration, failure-rate, flaky rate.

### 4) DevEx

- [ ] Quarantine & deflake top-10 offenders; record in dashboard.
- [ ] Pre-commit adoption >90% across workspaces.

### 5) Docs/Governance

- [ ] Update Security Evidence section in README and release notes template.
- [ ] Add “Gap Sweep” automation comment to PRs.

## Definition of Done

- Evidence attached to every v\* tag; verification step passes.
- Dashboards live with datasources wired; alerts firing on thresholds.
- Median PR CI time continues downward trend; report numbers in retro.

## Deliverables

- PRs: release lane gate, cosign verify; extra scoped callers.
- Artifacts: imported dashboards + alert rules.
- Docs: updated README, runbooks, and release notes template.
