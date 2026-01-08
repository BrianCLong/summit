# Legacy Ingest & Migration Playbook

This playbook codifies reusable patterns, pipelines, and customer-facing flows for migrating legacy systems into CompanyOS with minimal disruption and maximum auditability.

## Migration patterns

### Cutover strategies

- **Big bang**: Single cutover window after full rehearsal; use only when data volume is small, downtime is acceptable, and reconciliation coverage is complete.
- **Phased domain rollout**: Prioritize domains (e.g., identity → entitlements → activity) with **read-only shadowing** first, then **read/write partial ownership** as confidence grows; best default for complex estates.
- **Strangler/parallel run**: Stand up CompanyOS services beside legacy, fronted by a **routing/adapter layer**; progressively reroute traffic or workflows by feature flag until the legacy path is idle.

### Data state transitions

- **Read-only shadow**: Ingest snapshots + change streams; CompanyOS stays non-authoritative, exposes **diff dashboards** and alerting for drift.
- **Dual-write with reconciliation**: Enable writes in both systems through a guarded adapter; reconciliation jobs flag divergence before accepting CompanyOS as source of truth.
- **CompanyOS authoritative**: Final state; legacy becomes read-only for history and decommissioning exports.

### Coexistence and source-of-truth rules

- Declare **domain-level SoT** (per bounded context) and enforce via contract tests + ownership matrix.
- Use **event provenance stamps** (source system, ingestion time, checksum) on every record for audit.
- Prefer **last-writer-wins with vector clock** for hot paths; fall back to **human-reviewed merge queues** for conflicts in regulated data.
- Maintain **idempotent ingest jobs** with replayable checkpoints to handle partial failures.

## Ingestion & reconciliation pipelines

### Connectors and extraction

- **Databases**: Use logical replication/CDC (Postgres WAL, MySQL binlog) where available; otherwise periodic snapshot + delta hashing.
- **APIs**: Paginate with backoff, capture ETags/Last-Modified, and sign requests. Store raw payloads in an immutable evidence bucket.
- **Files**: Support batch (S3/GCS/Azure Blob/SFTP). Enforce manifest with file counts, checksums, and schema version.

### Canonical mapping and normalization

- Central **mapping specs** (per entity) define field lineage, transforms, validation rules, and nullability.
- Apply **schema versioning**; reject or quarantine records with incompatible versions.
- Normalize identifiers into **CompanyOS UUIDs** with deterministic key derivation (e.g., UUIDv5 over legacy natural keys + namespace).

### Quality gates and deduplication

- **Structural validation**: JSON schema or protobuf descriptors checked on ingest.
- **Content validation**: Required fields, referential integrity against canonical lookup tables, and semantic rules (e.g., end_date ≥ start_date).
- **Deduplication**: Composite keys (normalized email + tenant), phonetic matching for names, and **confidence-scored merge policies** with human overrides.

### Reconciliation & conflict resolution

- **Drift detection**: Periodic reconciler compares legacy vs. CompanyOS counts, checksums per slice (tenant/date), and sample-level diffs.
- **Merge policy** examples:
  - Immutable facts (events, audit logs): append-only; never overwrite.
  - Slowly changing attributes: keep full history with effective dating; current view derived from latest valid period.
  - Mutable profile fields: last-writer-wins if timestamp skew < threshold; else route to **conflict review queue**.
- **Observability**: Emit metrics (ingest lag, reject rate, reconcile coverage), traces around connector latency, and structured logs with record fingerprints.

## Customer-facing migration flows

- **Option selection wizard**: Let customers choose big bang vs. phased vs. strangler; show downtime expectations and controls (feature flags, read-only windows).
- **Preflight report**: Before execution, surface estimated volumes, risk hotspots (missing identifiers, field sparsity), and rehearsal results.
- **Live progress UI**: Stream ingest/reconcile metrics, records processed, rejects, drift counts, and SLA timers; provide drill-down to raw evidence.
- **Rollback/abort**: Allow scoped rollback by domain and time slice; preserve evidence and checkpoints. Offer **"safe stop"** that halts writes but continues read-only shadowing.
- **Exportable evidence**: Customers can download **reconciliation packs** (input manifests, transformed records, diff summaries, audit logs) for compliance.

## Standard migration runbook (template)

1. **Discovery**: Inventory systems, data domains, SoT decisions, identifiers, volumes, SLAs, and change windows.
2. **Access & security**: Provision least-privilege credentials; validate encryption in transit/at rest; sign evidence manifests.
3. **Schema & mapping**: Author mapping spec per entity; define transformation, defaults, null handling, and validation.
4. **Dry run**: Execute snapshot ingest to staging; measure reject/drift rates; tune dedupe thresholds; capture baseline metrics.
5. **Rehearsal with production-like load**: Enable CDC/stream; run reconciler; validate recovery time for failures.
6. **Cutover plan**: Freeze period (if needed), feature flags, communication plan, rollback criteria, and escalation matrix.
7. **Execution**: Monitor dashboards, reconcile deltas, triage rejects, and record evidence.
8. **Acceptance**: Stakeholder sign-off using "safe to cut over" checklist (below); enable CompanyOS as SoT for the targeted domain.
9. **Post-cutover**: Heightened observability window, auto-healing runbooks, backlog burn-down for manual merges, and legacy decommission plan.

## Example mapping spec (legacy → canonical: simplified Employee domain)

| Canonical field   | Legacy source                   | Transform                             | Validation                    | Notes                              |
| ----------------- | ------------------------------- | ------------------------------------- | ----------------------------- | ---------------------------------- |
| `employee_id`     | `hr.personnel_number`           | `uuidv5(NAMESPACE, personnel_number)` | Required, unique              | Deterministic ID for joins         |
| `tenant_id`       | `hr.company_code`               | Lookup to tenant registry             | Must exist                    | Domain-level SoT                   |
| `full_name`       | `hr.first_name`, `hr.last_name` | Trim + normalize casing               | Non-empty                     | Unicode-normalized                 |
| `email`           | `hr.work_email`                 | Lowercase; validate MX                | Required for active employees | Used for dedupe                    |
| `title`           | `hr.job_title`                  | Trim                                  | Optional                      |                                    |
| `manager_id`      | `hr.manager_personnel_number`   | Map via `employee_id` derivation      | If populated, must exist      | Enforce hierarchy integrity        |
| `status`          | `hr.employment_status`          | Map enums (ACTIVE/LOA/TERMINATED)     | Required                      | Termination triggers access revoke |
| `start_date`      | `hr.start_date`                 | Parse ISO; timezone naive             | ≤ today                       |                                    |
| `end_date`        | `hr.end_date`                   | Parse ISO                             | ≥ start_date                  | Null allowed                       |
| `source_metadata` | All columns                     | Capture raw payload hash + source     | Required                      | For audit/troubleshooting          |

## "Safe to cut over" checklist

- ✅ **Coverage**: ≥99% of targeted records ingested; rejects <0.1% and triaged.
- ✅ **Drift**: Reconciler shows zero blocking diffs for authoritative fields over the last 24h.
- ✅ **Latency**: Ingest + reconcile end-to-end SLA met (e.g., <5 minutes lag for CDC).
- ✅ **Security**: Access reviewed; secrets rotated post-run; evidence stored immutably.
- ✅ **Rollback ready**: Rollback steps rehearsed; checkpoints validated; blast radius scoped.
- ✅ **Stakeholder sign-off**: Business owners, data stewards, and security approve.

## Forward-leaning enhancements

- **Deterministic differential snapshots with zero-copy lakehouse storage** to accelerate rehearse/rollback cycles.
- **Policy-aware AI assistant** that auto-suggests mapping rules from sample payloads and flags ambiguous fields with confidence scores.
- **Ledger-backed provenance** with cryptographic commitments (Merkle roots) per batch to strengthen non-repudiation.
- **Self-healing connectors** that auto-throttle on API rate limits and apply adaptive chunk sizing based on observed p99 latency.
