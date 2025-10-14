# Data Retention Engine Compliance Overview

## Scope
The data retention engine governs lifecycle management for structured (PostgreSQL), graph (Neo4j), and object storage datasets that flow through IntelGraph services. It enforces retention rules, legal holds, archival controls, and evidentiary audit trails for all registered datasets.

## Capabilities
- **Policy Template Library** – Curated templates encode default retention periods, safeguards, and storage targets for regulated audit evidence, personal data, telemetry, ML training artifacts, and public intelligence datasets.
- **Automated Classification** – Dataset metadata (sensitivity markers, jurisdictions, data type, and tags) drive automatic selection of the correct template and classification level.
- **Lifecycle Enforcement** – Scheduled purges delete expired records from PostgreSQL tables and Neo4j labels while respecting legal holds and purge grace periods.
- **Legal Hold Integration** – Full or scoped legal holds block purges until released or expired, generating audit evidence for each action.
- **Archival Workflow** – Datasets can be promoted to archival tiers with immutable history and storage-tier updates in graph nodes.
- **Compliance Reporting** – Summaries surface overdue purges, legal hold counts, and archival activity for internal and external attestations.
- **Audit Logging** – Every policy change, purge, legal hold, and archival event is emitted to the governance audit channel (pino logger or Advanced Audit System adapter).

## Controls Mapping
| Control Area | Implementation Detail |
| --- | --- |
| SOC 2 CC6 / CC7 | Scheduled purges with audit logging provide change and activity monitoring. |
| SOC 2 CC8 / CC9 | Legal holds prevent unauthorized disposal of evidence. |
| GDPR Art. 5 & 17 | Automated classification, DSAR-ready templates, and purge enforcement support storage limitation and right-to-erasure. |
| HIPAA §164.316 | Archival workflows capture immutable histories for PHI datasets with regulated templates. |

## Operational Runbook
1. **Registration** – Services register datasets with metadata (owner, storage targets, classification hints).
2. **Template Resolution** – The engine assigns an appropriate template and stores the applied policy record.
3. **Scheduling** – Purge intervals are scheduled per dataset; scheduler telemetry is exported for monitoring.
4. **Monitoring** – Compliance reports highlight datasets approaching SLA breaches; alerts integrate with observability pipelines.
5. **Legal Holds** – Legal, compliance, or incident response can apply or release holds via governance APIs.
6. **Archival** – Operators initiate archival workflows for long-lived or decommissioned datasets.

## Evidence Artifacts
- Policy application and updates (`policy.applied`, `policy.updated` events)
- Purge executions and skips (`purge.executed`, `purge.skipped` events)
- Legal hold lifecycle (`legal-hold.applied`, `legal-hold.released` events)
- Archival completion logs (`archive.completed` events)
- Compliance reports generated for audit attestation

## Testing & Validation
- Unit tests cover policy assignment, legal holds, scheduled purges, compliance reporting, and archival workflows.
- Scheduled purge simulations validate interaction with PostgreSQL and Neo4j adapters using safe mocks.
- Repository persistence degrades gracefully when control tables are absent, preserving functionality in lower environments.

## Deployment Considerations
- Provision PostgreSQL table `data_retention_records` (JSONB columns) and configure retention-friendly indices.
- Ensure Neo4j datasets include `datasetId` and `retentionExpiresAt`/`archivedAt` attributes for lifecycle queries.
- Wire audit logger to the Advanced Audit System for tamper-evident compliance evidence in regulated environments.
- Enable scheduler monitoring to alert on overdue datasets and purge failures.
