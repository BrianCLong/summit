# Disaster Recovery (DR) Runbook

**Status**: Production Ready
**Last Updated**: 2025-10-26

This document outlines the procedures for backing up and restoring the `summit` platform's critical state in **Production** environments.

## Critical State

The platform's state consists of three critical components:

1.  **Relational Data (Postgres)**: Users, tenants, metadata.
2.  **Graph Data (Neo4j)**: Intelligence graph (entities, relationships).
3.  **Object Storage (S3)**: Evidence files, reports, artifacts.

## Recovery Objectives

*   **RPO (Recovery Point Objective)**: 5 minutes (via Postgres WAL + Neo4j Transaction Logs).
*   **RTO (Recovery Time Objective)**: 4 hours (Cluster rebuild + Data Restore).

## Backup Strategy

### Automated Backups
*   **Postgres**: Continuous WAL archiving to S3 + Daily full snapshots (pgBackRest).
*   **Neo4j**: Weekly full backups + Daily incremental backups to S3 (Neo4j Backup).
*   **S3**: Versioning enabled + Cross-region replication (CRR) to DR region.

### Manual Backup (Pre-Change)
Before major upgrades, trigger a manual backup:

```bash
# Trigger Velero backup (Full Cluster + PVCs)
velero backup create summit-pre-upgrade-$(date +%Y%m%d) --include-namespaces summit
```

## Restore Procedure (Total Region Failure)

### 1. Provision Infrastructure
Deploy the Summit infrastructure stack to the DR region (using Terraform/Helm).
Ensure `replicas: 0` for all deployments to prevent split-brain during data restore.

```bash
helm install summit ./charts/summit -f values.prod.yaml --set replicaCount=0
```

### 2. Restore Data

#### Postgres (Point-In-Time Recovery)
Restore from S3 WAL archives to a specific timestamp.

```bash
# Example using pgBackRest operator
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: summit-db
spec:
  bootstrap:
    recovery:
      source: "summit-db-prod"
      recoveryTarget:
        targetTime: "2025-10-26 14:00:00.000000+00"
  externalClusters:
    - name: summit-db-prod
      barmanObjectStore:
        destinationPath: s3://summit-backups-prod/postgres
        endpointURL: https://s3.amazonaws.com
EOF
```

#### Neo4j
Restore the latest backup from S3.

```bash
# Download backup
aws s3 cp s3://summit-backups-prod/neo4j/latest.dump .

# Load into Neo4j (via Admin Job)
kubectl apply -f k8s/admin/neo4j-restore-job.yaml
```

### 3. Verify Integrity
Run the integrity check script to ensure graph/relational consistency.

```bash
kubectl run integrity-check --image=summit/tools:latest -- ./scripts/verify-integrity.sh
```

### 4. Restore Service
Scale up the application.

```bash
helm upgrade summit ./charts/summit -f values.prod.yaml --set replicaCount=3
```

## Testing
DR drills must be conducted quarterly.
**Next Drill**: 2025-12-15
