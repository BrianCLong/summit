# Backup & Restore Procedures

## 1. Scope
Covers **PostgreSQL**, **Neo4j**, and **Redis** backups on Kubernetes or VM hosts. All backups are encrypted and stored in S3.

## 2. Backup Strategy

| Component | Frequency | Retention | Storage | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | Daily (02:00 UTC) | 30 days (S3) -> Glacier (1 year) | `s3://intelgraph-backups/${ENV}/postgres/` | SSE-KMS |
| **Neo4j** | Daily (03:00 UTC) | 30 days (S3) -> Glacier (1 year) | `s3://intelgraph-backups/${ENV}/neo4j/` | SSE-KMS |
| **Redis** | Daily (04:00 UTC) | 7 days | `s3://intelgraph-backups/${ENV}/redis/` | SSE-KMS |

## 3. Restore Procedures

### PostgreSQL Restore
1.  **Locate Backup**: Find the desired dump file in S3.
    ```bash
    aws s3 ls s3://intelgraph-backups/prod/postgres/
    ```
2.  **Download**:
    ```bash
    aws s3 cp s3://intelgraph-backups/prod/postgres/ig_YYYY-MM-DD.dump .
    ```
3.  **Restore**:
    ```bash
    dropdb -h postgres -U postgres ig || true
    createdb -h postgres -U postgres ig
    pg_restore -h postgres -U postgres -d ig --clean --if-exists ig_YYYY-MM-DD.dump
    ```

### Neo4j Restore (Enterprise)
1.  **Stop Service**: `kubectl scale statefulset neo4j --replicas=0`
2.  **Restore**:
    ```bash
    neo4j-admin database restore --from-path=/backups neo4j --force
    ```
3.  **Start Service**: `kubectl scale statefulset neo4j --replicas=1`

## 4. Disaster Recovery (DR) Drills
See [DR Drill Procedure](DR_DRILL.md) for details on executing and validating a full recovery.
