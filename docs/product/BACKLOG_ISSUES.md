# Backlog Issues (Epics/Stories)

## Epic 1: Evidence Integrity Gate

* **Story**: Implement content-addressed evidence storage using MinIO/S3.
* **Story**: Implement `ed25519` cryptographic signing for evidence bundles.
* **Story**: Create CI gate to enforce determinism on pipeline runs.

## Epic 2: Sandboxed Module Runtime

* **Story**: Set up gVisor/container runtime.
* **Story**: Enforce network policies restricting egress to the Capture Proxy.
* **Story**: Implement the first 10 core modules in the SDK.

## Epic 3: Capture Proxy

* **Story**: Create an HTTP/DNS proxy that records all traffic.
* **Story**: Enforce policy allowlists per tenant.
* **Story**: Implement "offline replay mode" from captured artifacts.

## Q2 2026 Alpha Features

* **Story**: AWS S3 bucket scanner - Attack surface mapping capability for cloud infrastructure
* **Story**: Public-facing web server scanner - External asset discovery and vulnerability detection
* **Story**: Deep Web Hunter passive scraper - Dark web intelligence collection
* **Story**: Translation API integration - Multilingual OSINT processing capability
* **Story**: Interactive dashboards with risk heatmaps - Visual threat intelligence interface

## Q3 2026 Beta Features (Multi-Agent Architecture)

* **Story**: Multi-agent Collaborative Analyst Swarm - Core AI orchestration for distributed intelligence
* **Story**: Human-in-the-loop feedback mechanism - Analyst validation and refinement workflows
* **Story**: STIX/JSON/MISP export formats - Standard threat intel sharing formats
* **Story**: API for SIEM/SOAR integrations - Enterprise security stack connectivity
* **Story**: IntelGraph graph intelligence engine v1 - Production-ready graph analytics

## Security & Compliance (IntelGraph Workstream)

* **Story**: Supply chain review (SEC-530) - Verify signatures, SBOM diffs, policy coverage
* **Story**: Cosign signatures + SLSA provenance - Artifact attestation and verification
* **Story**: Evidence Bundle v1.1 - Add consent report and lineage snapshot
* **Story**: Transparency log + PIIDetector v2 - Privacy protection and audit trails
* **Story**: Consent enforcement via OPA - Request-time policy enforcement (tenant, purpose, dataset)
* **Story**: SBOM drift v2 enforcement - Auto-PRs for dependency drift detection

## Enterprise Readiness

* **Story**: Multi-tenancy and RBAC - Enterprise isolation and access controls
* **Story**: Audit logging and compliance reporting - SOC2/ISO27001 foundation
* **Story**: Data backup and disaster recovery - RTO/RPO documentation and tested restore procedures
* **Story**: Entity Resolution Service v0 - Deduplication and entity matching for graph data
* **Story**: Marketplace v2 signed & scoring - Quarantine workflow for untrusted components

## Observability & Operations

* **Story**: Runbooks v1.1 - Pipeline compromise, data leak, cost overrun, policy violation scenarios
* **Story**: Recording rules + Grafana alert rules - Monitoring dashboards with runbook links embedded
