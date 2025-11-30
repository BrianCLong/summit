# Sprint 6 – Hosted SaaS Hardening & Trust Pack Plan

## Intent & Guardrails
- Theme: **Hosted SaaS Hardening + Trust & Proof Pack v1** focused on backups/DR, purge manifests, regional sharding hooks, and supply-chain evidence.
- Goal: deliver hosted-SaaS readiness for CompanyOS + Switchboard with auditable safety rails and exportable proof artifacts.
- RPO ≤ 15 min, RTO ≤ 60 min for core data paths; all tenant-level deletes dual-controlled and manifested; every shipped artifact carries SBOM + attestation.

## Architecture Threads
- **Backup/Restore & DR**
  - Primary metadata DB: PITR-enabled backups (encrypted, hourly), WAL archiving to regional object storage buckets with retention tiers (7d hot, 30d warm, 180d cold).
  - Evidence/log pointers: config/state snapshots + object storage lifecycle policies; bucket-level versioning + KMS.
  - Control plane emits provenance records (who/when/config) and metrics `backup_success_total`, `backup_failure_total`, `backup_duration_seconds`.
- **Regional Sharding & Residency**
  - Tenants carry `{region, residency_policy}`; routers map to per-region clusters/buckets via config (no code constants).
  - Data planes isolate write paths per region; cross-region reads allowed only when policy = `multi_region` with audit trails.
  - Health overlays expose per-region SLOs (latency/error) and alert on degradation.
- **Purge Manifests & Deletion Receipts**
  - Purge requests flow: Switchboard → Approvals Center (dual control for tenant scope) → policy check (`can_request_purge`, `can_approve_purge`, `purge_scope_valid`) → execution jobs.
  - Manifest schema: scope (tenant/entities), targeted systems, per-store status/timestamps, evidence references/log digests, verification outcome.
  - Receipt: signed hash of manifest + scope summary; stored immutably and surfaced in timeline/evidence viewer.
- **Trust & Proof Pack**
  - CI builds emit CycloneDX/SPDX SBOMs + SLSA-style attestations; artifacts stored with provenance and attached to releases.
  - Audit evidence bundle assembler pulls SBOMs, attestations, sample policies, purge manifests/receipts, and DR drill report for a release window.

## Work Breakdown & Deliverables
- **A. Backup/Restore & DR**
  - Implement backup jobs (IaC/Helm/Terraform) with encryption, retention, provenance logging, and alerting on failure.
  - Restore automation for fresh-cluster and PITR paths; DR drill pipeline capturing RPO/RTO evidence bundle.
  - Chaos hooks: DB node kill, network cut, evidence-store block; incidents/log markers emitted automatically.
- **B. Regional Sharding**
  - Schema update for tenant region/residency; routing adapters honoring config-mapped regions.
  - Tests ensuring single-region tenants never cross boundaries; docs covering supported region patterns and constraints.
  - Observability: per-region SLO metrics and outage alerts wired to Hosted SaaS Health dashboard.
- **C. Purge & Verification**
  - End-to-end purge workflow with dual-control, rationale capture, and policy gates.
  - Manifest/receipt storage adapter (versioned, immutable); verification checks per store with failure runbook linkage.
  - Metrics: `purge_requests_total`, `purge_success_total`, `purge_verification_failures_total`.
- **D. Trust & Proof Pack**
  - CI jobs for SBOM generation/validation and attestation signing/verification; deploys gated on valid attestations.
  - Evidence bundle CLI/API exporting artifacts + DR/purge examples with provenance logging.
- **E. Operability & Compliance**
  - SaaS SRE guide (oncall, DR, backup validation, purge verification, region outage playbooks).
  - Compliance checklist mapping features/evidence to SOC2/ISO control families; admin-only help links from Switchboard.

## Validation & Drills
- Automated tests: backup job smoke + restore simulation; sharding residency guards; purge workflow E2E with manifest/receipt; SBOM/attestation generation.
- DR drill (non-prod): simulate primary DB loss → restore → Switchboard health check; record RPO/RTO and bundle evidence.
- Chaos schedule: weekly staged tests for DB failure, network cut, and evidence store block with incident auto-creation.

## Risks & Mitigations
- Cross-region leakage: enforce residency policy in router middleware + config linting; add deny-by-default on missing region mapping.
- Backup gaps or corrupt snapshots: retention overlap + integrity checksums; alerting on age/skew; periodic restore drills.
- Purge authenticity: signed manifests/receipts and immutable storage; verification queries logged; failure runbook with rollback/abort steps.
- Supply-chain gaps: mandatory attestation verification before deploy; SBOM drift detection in CI; artifact retention with access logging.

## Forward-Looking Enhancements
- Regional quorum-aware routing with adaptive failover and privacy-preserving query federation for multi-region analytics.
- Confidential-compute-backed purge verification (TEE or zero-knowledge proofs) for higher-assurance deletion attestations.
- Predictive backup scheduling using workload seasonality + cost-aware storage tiering.
