# Operations Runbooks

## Backup and Restore
*   **Database Backup**: `pg_dump -U postgres > backup.sql`
*   **Database Restore**: `psql -U postgres < backup.sql`
*   **Evidence Backup**: `mc mirror s3/evidence backup/evidence`

## Rotation
*   **Key Rotation**: Rotate tenant `ed25519` keys via the Secrets Manager API. Ensure older keys remain available for read-only verification.
*   **Secret Rotation**: Rotate integration tokens and database credentials every 90 days.

## Scaling
*   **Scaling API**: Update `replicaCount` in Helm values or use HPA.
*   **Scaling Workers**: Increase the number of `runtime` and `scheduler` replicas.

## Air-Gap Replay Mode
*   To enable air-gap replay, set `NETWORK_MODE=offline` in the environment.
*   Load signed source packs into the evidence directory (`/var/lib/summit/evidence/inputs`).
*   Execute pipelines; the system will fetch data exclusively from the pre-captured source packs.
