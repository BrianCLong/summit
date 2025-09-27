# Disaster Recovery Restore Runbook

1. Execute `scripts/dr/neo4j_backup.sh`
2. Store signed archive in object storage
3. To restore, run `scripts/dr/neo4j_restore.sh <backup>`
4. Validate checksum and application health
