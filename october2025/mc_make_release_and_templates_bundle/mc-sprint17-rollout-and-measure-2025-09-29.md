# Sprint 17: Rollout & Measure
**Cadence:** 2025-11-25 → 2025-12-08 (14 days)  
**Slug:** `mc-sprint17-rollout-and-measure-2025-09-29`  
**Generated:** 2025-09-29T00:00:00 America/Denver

## Goal
Complete rollout of scoped callers across all paths, standardize the release command path, and publish metrics from dashboards into the retro.

## Swimlanes
### 1) CI Rollout
- [ ] Enable `ci.pr.infra.yml` and `ci.pr.docs.yml` and tune include/exclude.
- [ ] Concurrency groups per scope to avoid cache stampedes.

### 2) Release Experience
- [ ] Adopt `make release:tag VERSION=vX.Y.Z` as the standard.
- [ ] Automate release notes population from template and evidence links.

### 3) Evidence & Policy
- [ ] Verify-attestation on main artifacts as part of tag flow.
- [ ] OPA gate extended with signer identity and artifact digest rules.

### 4) Metrics & Retro
- [ ] Export p50/p95 PR CI time, failure-rate trend, flaky trend into the retro doc.
- [ ] Track success ratio improvement vs. Sprint 14 baseline.

## Definition of Done
- Infra/docs callers live, tuned, and green.
- Release notes template adopted; evidence links embedded.
- Retro includes concrete metrics from dashboards.

## Deliverables
- PRs: infra/docs callers, Makefile, release-notes automation.
- Artifacts: retro metrics export (CSV/MD), updated runbooks.
