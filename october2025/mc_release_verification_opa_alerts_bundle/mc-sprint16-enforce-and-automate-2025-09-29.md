# Sprint 16: Enforce & Automate

**Cadence:** 2025-11-11 → 2025-11-24 (14 days)  
**Slug:** `mc-sprint16-enforce-and-automate-2025-09-29`  
**Generated:** 2025-09-29T00:00:00 America/Denver

## Goal

Make evidence and policy non-optional: enforce gates, enable verify-attestation in the happy path, and turn on paging with alert rules.

## Swimlanes

### 1) Release Evidence Enforcement

- [ ] Integrate `policy.check.release-gate.yml` with the hardened release path (required on tags).
- [ ] Enable `release.verify-attestation` for OCI images (set IMAGE_REF for main artifacts).

### 2) Policy & Governance

- [ ] Extend OPA input to include artifact digests and signer identities; add deny rules for untrusted identities.
- [ ] Add CODEOWNERS approvals requirement for release PRs.

### 3) Observability

- [ ] Load `monitoring/alerts/ci_alerts.yml` into Prometheus; connect Grafana alerts to on-call.
- [ ] SLOs: p95 CI duration < 12m; failure-rate < 10% (alerting thresholds tighten).

### 4) DevEx

- [ ] One-click `make release:tag v=X.Y.Z` that produces SBOM + provenance, runs OPA gate, and verifies attestation.
- [ ] Flaky tests top-10: fixed or quarantined with owner and due date.

## Definition of Done

- Tag pipeline fails without SBOM+provenance; cosign verify-attestation succeeds for main artifacts.
- Prometheus alert rules active; Grafana alerts configured; runbook links in on-call.
- SLOs trending towards targets for 7 continuous days.

## Deliverables

- PRs: OPA gate integration, cosign verify job, make targets.
- Artifacts: alert rules loaded; runbook updates.
- Docs: updated security evidence and on-call procedures.
