# Summit Data Retention Compliance Guide

## Overview

Summit stores regulated customer telemetry in PostgreSQL and graph audit
context in Neo4j. To maintain GDPR right-to-erasure guarantees and SOC 2
control evidence, the platform now ships a unified retention toolchain:

- **Metadata-driven SQL** for PostgreSQL (`server/db/retention/postgres_data_retention.sql`).
- **APOC-enabled Cypher** for Neo4j (`server/db/retention/neo4j_data_retention.cypher`).
- **Kubernetes CronJobs** that execute the retention logic on an audited
  cadence (`infra/k8s/cronjobs/data-retention-cronjobs.yaml`).
- **OPA policy** that blocks misconfigured CronJobs before deployment
  (`policy/opa/retention.rego`).

The solution separates *policy* (retention rules) from *execution*
(CronJobs) so compliance teams can adjust retention horizons without code
changes while SRE teams keep deterministic automation.

## PostgreSQL retention workflow

1. Deploy the metadata schema by running the SQL file once against the
   production database:

   ```bash
   psql -f server/db/retention/postgres_data_retention.sql
   ```

2. Register retention rules in `compliance.retention_rules` for every
   table that contains personal data. Each rule specifies:

   - fully qualified table name (`table_fqn`)
   - primary key and timestamp tracking columns
   - retention window (for example `INTERVAL '365 days'`)
   - action (`ARCHIVE` or `DELETE`)
   - optional archive table (`archive_table_fqn`) and filter predicate

3. Schedule `SELECT compliance.apply_retention();` via the Kubernetes
   CronJob. The function archives eligible rows to the configured archive
   table (creating it if necessary) or deletes them when GDPR erasure is
   mandated.

4. Audit trails land in `compliance.retention_audit_log`, providing
   immutable evidence for SOC 2 CC7.2/CC7.3 and GDPR Article 30 records.

## Neo4j retention workflow

1. Ensure APOC is installed on the cluster (the script relies on
   `apoc.periodic.iterate` and `apoc.do.when`).
2. Label nodes that need retention with `RetentionManaged`, set
   `retentionExpiresAt` (datetime) and optionally `retentionAction`
   (`ARCHIVE` or `DELETE`).
3. Execute the Cypher script using the CronJob or manually via
   `cypher-shell -f server/db/retention/neo4j_data_retention.cypher`.
4. The script snapshots archived payloads into `ArchivedSnapshot` nodes
   and writes run metrics to a `RetentionAudit` node keyed by execution
   UUID so auditors can verify coverage.

## Kubernetes automation

The `infra/k8s/cronjobs/data-retention-cronjobs.yaml` manifest delivers
separate jobs for PostgreSQL and Neo4j. Key operational notes:

- Create ConfigMaps that surface the latest scripts to the cluster:

  ```bash
  kubectl create configmap data-retention-postgres \
    --from-file=postgres_data_retention.sql=server/db/retention/postgres_data_retention.sql

  kubectl create configmap data-retention-neo4j \
    --from-file=neo4j_data_retention.cypher=server/db/retention/neo4j_data_retention.cypher
  ```

- Provision the `data-retention` service account with least privilege
  network and secret access.
- Populate the `postgres-maintenance-credentials` and
  `neo4j-maintenance-credentials` secrets with read/write credentials
  dedicated to maintenance tasks (no application superuser keys).
- Configure the optional `CONFIG_CHECKSUM` annotation via your CD system
  to force Pod restarts whenever the scripts or secrets change.
- The schedules stagger PostgreSQL (02:00 UTC) and Neo4j (02:30 UTC)
  runs to avoid overlapping load.

## OPA enforcement

The `policy/opa/retention.rego` policy validates every CronJob labeled
`app.kubernetes.io/name=data-retention` and denies deployment when:

- the compliance label `summit.io/compliance-scope` is missing,
- schedules attempt to run faster than hourly,
- the concurrency policy is not `Forbid`,
- resource limits, read-only filesystems, or script mounts are missing,
- the manifest lacks the `checksum/config` change tracking annotation.

Integrate the policy with Conftest, Gatekeeper, or CI to guarantee that
retention jobs remain hardened before they reach production.

## Monitoring and evidence collection

- Stream `compliance.retention_audit_log` (PostgreSQL) and
  `RetentionAudit` (Neo4j) into your SIEM for centralized evidence.
- Alert when `status = 'ERROR'` in the PostgreSQL audit log or when the
  Neo4j `errors` array is non-empty.
- Record monthly review notes in SOC 2 binders referencing CronJob runs
  and audit artifacts.

## Incident response checklist

1. Pause both CronJobs (`kubectl patch cronjob ... --type merge -p '{"spec":{"suspend":true}}'`).
2. Investigate the offending rule or dataset. Roll back archive tables if
   an incorrect delete occurred.
3. Document the event in the incident tracker referencing the audit log
   entry IDs.
4. Resume the CronJobs once remediation is complete and update the
   compliance calendar.

Maintaining these steps keeps Summit aligned with GDPR retention
principles and SOC 2 CC2.3 change-management expectations.
