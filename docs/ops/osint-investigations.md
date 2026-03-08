# Operations Plan: OSINT & Investigations Subsumption

## 1. Deployment Modes
* **SaaS:** Fully managed by Summit. Connectors execute within Summit's governed infrastructure, utilizing tenant-specific keys.
* **On-Premise:** Customer hosts Summit within their VPC. Connectors are configured with customer's own API keys and network policies.
* **Air-Gapped Mode:** Summit is deployed in an isolated environment. External tool connectors (e.g., Social Links API, Orpheus) are strictly disabled. Only local adapters or pre-ingested datasets are permitted.

## 2. Scaling
* **Agent Plane:** Horizontal scaling of agent runners based on queue depth and playbook complexity.
* **Data Plane:** Scalable graph database backends (e.g., Neo4j clusters) to handle high-volume OSINT ingestion and complex queries.
* **Evidence Store:** Object storage (e.g., S3-compatible) with lifecycle policies for long-term retention of `report.json`, `metrics.json`, and `stamp.json`.

## 3. Backup & Restore
* **Graph Database:** Nightly full backups and continuous WAL archiving for point-in-time recovery.
* **Evidence Store:** Immutable storage with cross-region replication to prevent accidental deletion or tampering.
* **Vault:** Secure backups of encrypted secrets, tested quarterly.

## 4. Incident Response
* **Connector Outages:** Automated fallback strategies or graceful degradation (e.g., disabling specific playbooks) if external APIs (Social Links, Orpheus) are unavailable.
* **Data Breaches:** Playbooks for isolating affected tenants, revoking credentials, and notifying stakeholders.
* **ToS Violations:** Immediate suspension of offending agents/playbooks and automated reporting to compliance officers.

## 5. Observability Dashboards
* **Agent Telemetry:** Real-time metrics on playbook execution times, tool call success rates, and queue depth.
* **Governance Metrics:** Dashboards tracking ToS violations, rate-limit hits, and policy compliance.
* **Cost Tracking:** Per-tenant and per-connector cost breakdowns (especially crucial for APIs like Social Links).

## 6. Audit Log Retention
* **Immutable Logs:** All agent steps, tool calls, and policy decisions are logged immutably.
* **Retention Policies:** Configurable retention periods (e.g., 1 year, 7 years) to satisfy regulatory requirements.

## 7. SBOM & Provenance
* **Automated Generation:** CI pipeline generates CycloneDX/SPDX SBOMs for all Summit components, including connector SDKs.
* **Release Artifacts:** SBOMs and build attestations are published alongside each release and referenced in the `stamp.json` of evidence artifacts.

## 8. Runbooks for Connector Outages
* **Social Links API Outage:** Disable dependent playbooks. Display banner in the UI. Notify users. Re-enable upon API restoration.
* **Orpheus Cyber Outage:** Degrade to cached risk scores (if permitted by ToS) or skip risk-scoring steps in the playbook, annotating the report with "Risk score unavailable due to upstream outage."
* **Oceanir Outage:** Fail media verification tasks with a clear error message. Do not attempt verification without the trusted upstream service.
