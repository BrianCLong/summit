# Backup, Archival & Cold Storage Strategy v0

## 1. Data protection taxonomy

- **Hot (operational)**: Primary OLTP databases, KV stores, message queues, caches with write-through, configuration stores.
  - **RPO/RTO**: RPO ≤ 5 minutes via streaming/CDC; RTO ≤ 30 minutes with automated failover and warm replicas.
  - **Security**: In-flight TLS 1.2+; at-rest encryption with cloud KMS-managed keys (per-tenant keys where supported). Access via least privilege service roles; secrets in HSM/KMS only.
- **Warm (recent history)**: Analytics warehouses, search clusters, blob/object buckets for recent uploads, time-series stores.
  - **RPO/RTO**: RPO ≤ 1 hour using hourly snapshots + incremental logs; RTO ≤ 4 hours using fast restore of latest snapshot plus log replay.
  - **Security**: Encryption at rest with provider-managed keys; sensitive tenants may opt into customer-managed keys (CMK). Network controls (VPC/private links), audit logging required.
- **Cold (archive)**: Long-term object storage tiers, infrequently accessed tenant exports, regulatory archives.
  - **RPO/RTO**: RPO ≤ 24 hours (daily batch ingest); RTO ≤ 72 hours acknowledging retrieval delays from deep archive.
  - **Security**: Server-side encryption with CMK; immutable (WORM) buckets for regulated data; access brokered via break-glass approval + logging.
- **Immutable logs**: Audit/provenance logs, security events, compliance journals.
  - **RPO/RTO**: RPO ≤ 1 minute via append-only stream fan-out; RTO ≤ 30 minutes (hot copy) and ≤ 24 hours (archive copy).
  - **Security**: Dual-write to two regions with independent KMS keys; WORM policies and integrity proofs (hash chains/merkle roots) stored separately.

## 2. Backup & restore mechanics

- **Capture methods**
  - **Snapshots**: Block-level snapshots for databases/filesystems; object versioning for buckets. Schedule: hot = every 15m with 7d retention; warm = hourly with 30d retention; cold = daily with 365d retention; immutable logs = hourly plus continuous stream sink.
  - **Streaming/CDC**: Logical replication/CDC to staging buckets for point-in-time recovery (PITR) up to 7d for hot; 3d for warm. Capture tenant identifiers to allow scoped replays.
  - **Periodic fulls**: Weekly full backups for hot/warm datastores to simplify restore chains; monthly for cold archives.
- **Verification & integrity**
  - Automated backup job health checks (freshness, size deltas, success signals) with pager on drift.
  - Integrity: checksums on backup artifacts; quarterly bit-rot audits for cold tiers; cross-region comparison for immutable logs.
  - **Restore tests**: Monthly per-service game days restoring to isolated env; quarterly tenant-level restore drill; annual full-region failover simulation aligned with DR.
- **Granularity & restore options**
  - **Point-in-time**: PITR from CDC for hot/warm within retention windows.
  - **Scheduled points**: Snapshots provide 15m/hourly/daily restore points per policy.
  - **Per-tenant restores**: Backups tagged by tenant/org ID; logical exports stored separately to support tenant-scoped replay into clean environment before merging.

## 3. Archival & deletion

- **Transition criteria**
  - Hot → warm: 14–30 days of inactivity or promotion of derived datasets out of OLTP.
  - Warm → cold: ≥90 days inactivity or policy-based lifecycle rules (e.g., retention policy moving objects to infrequent access/Glacier/Deep Archive).
  - Immutable logs: dual-path (hot searchable store + cold WORM archive) with 1-year searchable, 7-year archive default.
- **Discovery/search**
  - Warm data indexed/searchable; cold data discoverable via metadata catalog (Glue/BigQuery/Atlas) with pointers to archive location and retention/hold status. Retrieval requests routed through service desk workflow.
- **Retention, privacy, legal hold**
  - Retention schedules encoded as storage lifecycle rules; deletion jobs must honor legal holds and privacy erasure requests (DSR) by writing tombstones and propagating to derived stores.
  - For cold archives under hold, suspend lifecycle expiration until hold cleared; maintain audit trail of every override.

## 4. Artifacts

### Backup & Archival Strategy v0 outline

1. Scope & data classes (hot/warm/cold/immutable).
2. RPO/RTO & security posture per class.
3. Backup mechanisms: snapshots vs streaming vs fulls; schedules and retention.
4. Restore mechanics: PITR, snapshot restores, per-tenant flow; testing cadence.
5. Archival lifecycle: transitions, catalogs, access workflows.
6. Compliance: encryption, WORM, key management, legal holds, audit logging.
7. Operations: monitoring signals, runbooks, SLOs, escalation paths.

### Example runbook: tenant-level data incident

1. **Trigger**: Incident declares tenant data corruption/loss; identify tenant ID and affected service/datastore.
2. **Containment**: Freeze writes for tenant via feature flag or routing rule; snapshot current state for forensics.
3. **Select restore point**: Determine incident onset; choose PITR timestamp or snapshot prior to event.
4. **Restore to quarantine env**:
   - Provision isolated DB/schema using latest full + incremental/CDC replay scoped to tenant.
   - Verify checksums/row counts; run tenant-specific integrity tests.
5. **Validate with tenant & product owner**: Provide diff summary; obtain approval to promote.
6. **Promote**: Replace tenant partition or apply logical replay to production with double-write verification; unfreeze writes.
7. **Post-incident**: Backfill analytics/search indexes; update incident timeline; add test to detect class of corruption.

### Checklist: "Data store is backup/restore-ready if…"

- [ ] RPO/RTO documented and mapped to data class; validated in observability dashboards.
- [ ] Backup jobs scheduled (snapshots + CDC/full) with retention configured and encrypted at rest.
- [ ] Backups labeled with tenant identifiers and environment metadata; stored in at least two regions.
- [ ] Automated freshness and size-delta alerts configured; oncall escalation documented.
- [ ] Monthly restore test completed and logged; issues have remediation owners.
- [ ] Runbook exists for tenant-level and region-level recovery; links reviewed in incident tooling.
- [ ] Lifecycle rules to transition warm→cold and delete/expire per retention, respecting legal holds/DSRs.
- [ ] Access to backups/archives gated by least privilege, MFA, and audit logging; keys managed in KMS/rotated.
- [ ] Immutable logs stored with WORM + integrity proofs; restore path validated.
