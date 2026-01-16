# Runbook Index

## Critical Service Runbooks
*   [API Troubleshooting](runbooks/api-troubleshooting.md) (To be created)
*   [Database Recovery](runbooks/db-recovery.md) (To be created)
*   [Ingestion Lag](runbooks/ingest-lag.md) (To be created)

## Operational Procedures
*   [Backup & Restore](../ops/BACKUP_RESTORE.md)
*   [Disaster Recovery Drill](../ops/DR_DRILL.md)
*   [Release Process](../ops/release.md)
*   [Incident Response](../ops/INCIDENT_PLAYBOOK.md)

## Common Tasks
*   **Restart Service**: `kubectl rollout restart deployment <name>`
*   **View Logs**: `kubectl logs -f -l app=<name>`
*   **Check Status**: `kubectl get pods`
