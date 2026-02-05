# PostgreSQL High Availability (GA)

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready (deployment deferred pending infra approval)

## Purpose

Provide a GA-ready HA PostgreSQL deployment path with primary/replica services and PDBs.

## In-Repo Manifests

- `charts/ha/postgresql-ha.yaml` (primary + replica + PDB)
- `charts/overlays/regions/us-east-1/values.yaml`
- `charts/overlays/regions/us-west-2/values.yaml`

## Deployment (Example)

```bash
# Apply HA manifest directly
kubectl apply -f charts/ha/postgresql-ha.yaml
```

## Notes

- Use managed PostgreSQL (RDS/Aurora) when available and map to `DATABASE_URL`/`DATABASE_READ_URL` in region overlays.
- Ensure backups and PITR are enabled via `k8s/dr/backup-cronjobs.yaml`.
