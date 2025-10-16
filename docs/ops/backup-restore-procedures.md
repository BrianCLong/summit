### Scope

Covers **PostgreSQL**, **Neo4j**, and **Redis** backups on Kubernetes or VM hosts. Uses encrypted object storage (S3) with lifecycle policies.

### Storage & Encryption

- Create `s3://intelgraph-backups/${ENV}/` with **SSE‑KMS**, versioning, lifecycle to Glacier after 30 days.

### Kubernetes CronJobs (Postgres)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pg-backup
  namespace: intelgraph
spec:
  schedule: '0 2 * * *' # daily 02:00
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: pgdump
              image: postgres:16
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: ig-secrets
                      key: POSTGRES_PASSWORD
              command: ['/bin/sh', '-c']
              args:
                - |
                  ts=$(date +%F-%H%M%S);
                  pg_dump -h postgres -U postgres -Fc -d ig > /tmp/ig_$ts.dump && \
                  aws s3 cp /tmp/ig_$ts.dump s3://intelgraph-backups/prod/postgres/ig_$ts.dump --sse aws:kms
              volumeMounts:
                - name: tmp
                  mountPath: /tmp
          restartPolicy: OnFailure
          volumes:
            - name: tmp
              emptyDir: {}
```

### PostgreSQL Restore

```bash
aws s3 cp s3://intelgraph-backups/prod/postgres/ig_2025-09-01-020000.dump .
dropdb -h postgres -U postgres ig || true
createdb -h postgres -U postgres ig
pg_restore -h postgres -U postgres -d ig --clean --if-exists ig_2025-09-01-020000.dump
```

### Neo4j Backups

**Community Edition:** requires **offline** file‑system level backups.

- Scale `neo4j` **down to 0**, snapshot PVC, copy to S3.
- Or use `tar` of `/data` after clean shutdown.

**Enterprise Edition:**

```bash
neo4j-admin database backup --to-path=/backups --database=neo4j
aws s3 cp /backups/neo4j-backup-*.db s3://intelgraph-backups/prod/neo4j/ --recursive
```

**Restore (Enterprise):**

```bash
neo4j-admin database restore --from-path=/backups neo4j --force
```

### Redis Backups

- Enable RDB snapshots (`save 900 1` etc.).
- Nightly copy of `dump.rdb` to S3.

### Verification & DR Drills

- Monthly restore drill in a **throwaway namespace** and run health checks & smoke tests.
- Track **RPO ≤ 5m (tiered)** and **RTO ≤ 1h** targets.

```

```
