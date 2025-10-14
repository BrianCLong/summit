# Golden Path Platform — Paved-Road CI/CD Kickoff Plan

## Mission Snapshot

- **Objective:** Deliver a one-command scaffold and CI/CD templates that produce signed, SBOM-attached, provenance-verified releases by default.
- **Timeline:** 6-week MVP window.
- **Launch Criteria:** New repo scaffold builds green, all artifacts are signed with SBOM + provenance, OPA merge gates enforced, rollback playbook documented.

## Scope (MVP)

1. **Railhead CLI:** Generate HTTP API, worker, and UI service repos with pinned SHAs and pre-commit hooks.
2. **CI/CD Pipelines:** GitHub Actions/GitLab CI sequence — build → test → SBOM (Syft) → vuln scan (Grype/Trivy) → sign (cosign, keyless) → attest (SLSA provenance) → release → canary-ready deploy.
3. **Policy Packs:** OPA merge gates covering license allowlist, secret scan, and CVE budget thresholds.
4. **Example Service:** Demonstrate pass/fail policy gates and deployment workflow.
5. **Documentation & Enablement:** Usage docs, walkthrough video, and rollback playbook.

## Definition of Ready (DoR)

- ADR draft describing toolchain choices (ADR-001) published and linked.
- Policy budget thresholds defined and agreed with Security & Product Ops.
- Artifact registry access confirmed (signing + SBOM storage buckets).
- Baseline dashboards & SLOs defined (pipeline p50 < 8m, bootstrap < 90s, ≥98% green builds on `main`).

## Definition of Done (DoD)

- CLI railhead creates a repo that passes the full pipeline end-to-end on first run.
- Build outputs include SBOM (SPDX JSON) and cosign/in-toto provenance attestations attached to releases.
- OPA policy bundle enforced in merge gates; violations block merges with SARIF feedback.
- Rollback playbook published covering signed artifact verification and deployment reversal.
- Evidence bundle captured: signed release links, SBOM samples, policy evaluation logs.

## Kickoff Checklist (Day 0, for every team)

- [ ] Confirm DoR artifacts created and linked (ADR draft, policy thresholds, registry access confirmations).
- [ ] Open ADR PR and tag Security, SRE, and Product Ops stakeholders.
- [ ] Stand up synthetic probes before first deploy (availability + provenance verification endpoints).
- [ ] Create baseline dashboards and SLO monitors on Day 1.
- [ ] Configure CI secrets (registry tokens, cosign OIDC, Syft/Grype) in both GitHub and GitLab runners.
- [ ] Provision SBOM/provenance artifact storage buckets with retention policies.
- [ ] Validate OPA policy bundle loads in staging environment.
- [ ] Attach weekly status evidence starting Day 1 (ADR link, dashboard screenshot, release notes, policy diff).
- [ ] **Absolutely ensure the first merge is clean:** run the scaffold pipeline on a draft PR, resolve blockers, and confirm branch protections before requesting review.

## Week-by-Week Focus

| Week | Focus                           | Key Outputs                                                                |
| ---- | ------------------------------- | -------------------------------------------------------------------------- |
| 1    | Toolchain decisions & bootstrap | ADR-001 draft; registry access; CLI skeleton; baseline dashboards          |
| 2    | CLI scaffolds & templates       | API/worker/UI templates; pinned dependencies; pre-commit hooks             |
| 3    | Pipeline assembly               | Build & test jobs; SBOM via Syft; vuln scans; artifact uploads             |
| 4    | Signing & provenance            | Cosign keyless signing; SLSA attestations; registry integration            |
| 5    | Policy enforcement              | OPA bundles; merge gate wiring; license/secret/CVE budgets validated       |
| 6    | Hardening & demo                | Canary-ready deploy; example service; walkthrough video; rollback playbook |

## Deliverables Checklist

- [ ] Railhead CLI with templates for API, worker, and UI services.
- [ ] CI pipeline YAML for GitHub Actions (and/or GitLab CI variant).
- [ ] OPA policy bundle with license, secret, and CVE budget rules.
- [ ] Example service demonstrating policy gates and deployment readiness.
- [ ] Documentation set (setup guide, operations runbook, walkthrough video).

## Interfaces & Contracts

- **Artifact Signing:** cosign keyless signatures stored with release assets.
- **Provenance:** in-toto/SLSA JSON attestations attached to build outputs.
- **SBOM:** SPDX JSON generated via Syft and referenced in release metadata.
- **Policy Inputs:** SARIF from scans, SPDX SBOM data, build metadata exported to OPA.

## Observability & SLOs

- Pipeline latency p50 < 8 minutes, p95 < 12 minutes.
- Template bootstrap command < 90 seconds.
- ≥98% successful green builds on `main`; track flaky job budget and retry policy.
- Dashboards: pipeline throughput, signing verification results, SBOM coverage, OPA violation trends.
- Synthetic probes: pipeline API health, provenance verification endpoint, artifact registry availability.

## Security & Compliance Gates

- Secret scanning, SAST, license compliance, CVE budget check integrated into CI.
- Cosign verification executed prior to deploy; failures trigger automatic rollback.
- Policy bundle enforces merge gating on license allowlist and vulnerability thresholds.

## Risks & Mitigations

- **Tool Sprawl:** Pin versions and maintain lockfiles for CLI templates and CI jobs.
- **Flaky CI:** Deterministic builds using caches; implement retries and alerting on failure rate anomalies.
- **Admission Control (Track B):** Plan SLSA L3+ provenance verification in admission controller for moat phase.

## Evidence Requirements

- Attach weekly status evidence: ADR link, dashboard screenshot, release notes, policy diff.
- Maintain repository of SBOM samples and signed release artifacts for compliance audits.
- Archive policy evaluation logs with timestamps and build IDs.

## Next Steps

1. Finalize ADR-001 toolchain PR and route for approvals (Security, SRE, Product Ops).
2. Complete baseline dashboards and synthetic probes prior to first deploy.
3. Stand up example service and iterate through policy gate pass/fail scenarios.
4. Prepare walkthrough video script aligning with rollback playbook and compliance evidence capture.
