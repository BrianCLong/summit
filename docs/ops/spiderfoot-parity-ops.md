# Ops Plan: SpiderFoot Parity & Proof Moat

## 1. Deployment Artifacts

*   **Eval/Local:** A `docker-compose.yml` defining the Control Plane, Storage (Postgres/Neo4j), Evidence Store (MinIO), and Runner.
*   **Production:** Helm chart (`k8s/summit-intel/`) for Kubernetes, featuring scalable runner deployments and ingress configurations.
*   **Air-Gapped:** An installation package containing pinned Docker images, offline fixture datasets, and configuration for a private registry and on-premise Evidence Store.

## 2. Runbooks (`ops/runbooks/`)

*   `key_rotation.md`: Procedures for rotating signing keys and updating Vault.
*   `backup_restore.md`: Steps to backup the Graph Store, Metadata DB, and Evidence Store, and test restoration.
*   `evidence_purge.md`: Executing data retention policies to safely delete evidence bundles based on classification.
*   `verify_bundle.md`: Instructions for operators to manually verify the integrity of an evidence bundle offline.

## 3. SLOs and Monitoring

*   **Pipeline Throughput:** Jobs processed per minute.
*   **Pipeline Latency:** P95 time from job submission to completion.
*   **Integration Delivery Latency:** Time from alert generation to successful delivery in SIEM/SOAR.
*   **UI Latency:** P95 response time for case and graph queries.
*   **Observability:** Implement OpenTelemetry for tracing. Logs and traces must *never* contain PII or secrets.

## 4. Tenancy & Residency

*   **Egress Control:** Each tenant requires a strictly defined network egress allowlist.
*   **Data Residency:** Evidence retention policies are configurable per-tenant to comply with regional regulations (e.g., GDPR).

## 5. CI/CD Gates

*   Verify SLSA provenance attestations before merging to main.
*   Require Cosign signature verification on all deployed Docker images.

## 6. PR-01 Ops Initial Setup

For the first milestone, a baseline `docker-compose.yml` must be created to provide the local evaluation environment. See the file `docker-compose.spiderfoot.yml` at the root of the repository.
