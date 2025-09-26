# Cross-Region Database Replication Runbook

## Overview

This guide documents how Summit operates PostgreSQL and Neo4j in a highly available, cross-region topology. The configuration aligns with Workstream 90 requirements and complements the manifests in `ops/dr/` plus the Helm charts in `ga-graphai/infra/helm`.

* **PostgreSQL** – Aurora-compatible streaming replication with one writer in `us-east-1` and read replicas in `us-west-2` and `eu-central-1`.
* **Neo4j** – Causal Cluster cores and read replicas distributed across the same three regions for low-latency queries.
* **Chaos Mesh** – Failure drills that validate regional failover and replication lag budgets.

## Architecture Summary

| Component | Primary Region | Secondary Regions | Notes |
|-----------|----------------|-------------------|-------|
| PostgreSQL | `us-east-1` writer | `us-west-2`, `eu-central-1` async replicas | Shared WAL archive in S3, Prometheus exporter, WAL replay guardrails |
| Neo4j | `us-east-1` cores (3 pods) | `us-west-2` core (1 pod), read replicas in both regions | Backups streamed to S3, discovery via headless Service |

## Helm Configuration

### PostgreSQL

Key values from `ga-graphai/infra/helm/postgres/values.yaml`:

```yaml
primaryRegion: us-east-1
secondaryRegions:
  - name: us-west-2
    replicas: 1
  - name: eu-central-1
    replicas: 1
replication:
  username: replicator
  password: CHANGEME_replicator
  maximumLagSeconds: "30"
monitoring:
  enabled: true
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9187"
init:
  s3WalArchive:
    enabled: true
    bucket: s3://summit-database-wal-archive
```

Apply the release:

```bash
helm upgrade --install summit-postgres ga-graphai/infra/helm/postgres \
  --namespace data-plane --create-namespace \
  --values ga-graphai/infra/helm/postgres/values.yaml
```

### Neo4j

Relevant values from `ga-graphai/infra/helm/neo4j/values.yaml`:

```yaml
regions:
  primary:
    name: us-east-1
    coreReplicas: 3
    readReplicas: 1
  secondary:
    - name: us-west-2
      coreReplicas: 1
      readReplicas: 2
    - name: eu-central-1
      coreReplicas: 0
      readReplicas: 2
backup:
  enabled: true
  s3Bucket: s3://summit-neo4j-backups
```

Deploy the cluster:

```bash
helm upgrade --install summit-neo4j ga-graphai/infra/helm/neo4j \
  --namespace data-plane --values ga-graphai/infra/helm/neo4j/values.yaml
```

Both charts expose annotations such as `replication.summit.sh/role` to allow GitOps or observability tooling to auto-discover topology.

## Reference Manifests

For environments that are not yet Helm-enabled, apply the curated manifests directly:

```bash
kubectl apply -f ops/dr/postgres-cross-region.yaml
kubectl apply -f ops/dr/neo4j-cross-region.yaml
```

These manifests mirror the Helm topology and include region-aware `StatefulSet` scheduling, replication credentials, and headless discovery services.

## Chaos Mesh Validation

`ops/chaos/experiments.yaml` defines two new scenarios:

1. **`postgres_primary_region_outage`** – Deletes the writer pod in `us-east-1`, waits for a replica promotion, and measures RPO/RTO with the replication lag budget from the Helm values.
2. **`neo4j_secondary_region_partition`** – Applies a network partition to `us-west-2` graph nodes to verify causal cluster recovery and routing fallbacks.

Run the suite:

```bash
kubectl apply -f ops/chaos/experiments.yaml
chaosctl run intelgraph-reliability-tests --focus cross-region
```

Monitor Prometheus alerts for `replication_applied_lag_seconds` (PostgreSQL) and `neo4j_cluster_available` to confirm the SLOs are maintained.

## Operational Playbook

1. **Bootstrap** – Deploy Helm releases, confirm pods scheduled per region labels, and register WAL/archive buckets.
2. **Failover Drill** – Execute the Chaos Mesh suite quarterly; ensure `kubectl get services` exposes the promoted writer endpoint.
3. **Backups** – Verify the Neo4j backup CronJob uploads to S3 and that WAL archives rotate per `retentionHours`.
4. **Observability** – Surface replication metrics in Grafana (port 9187 for PostgreSQL exporter) and configure alert thresholds aligned with `maximumLagSeconds`.
5. **Runbooks** – Update incident response docs with the annotations produced by the Helm charts for rapid triage.

Following these steps provides deterministic recovery across AWS regions while minimizing write lag and maintaining query locality.
