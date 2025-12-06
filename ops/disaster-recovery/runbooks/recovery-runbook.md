# Disaster Recovery Runbook

## Incident Signals
- Backup failures or verification failures
- Replica lag > 15 minutes or replication halted
- Primary region instability (loss of quorum, network isolation)
- Corrupted data detected via integrity checks or application errors

## Roles
- **Incident Commander (IC)**: coordinates communication and approvals.
- **DB Operator**: executes recovery steps and validates data.
- **SRE Oncall**: handles infra automation and observability.

## 1. Point-in-Time Recovery (PITR)
1. Freeze writes (application maintenance mode).
2. Identify target timestamp or WAL LSN from incident timeline.
3. Retrieve latest full backup and WAL files from object storage.
4. Restore into new cluster:
   - Create empty data directory.
   - Apply base backup: `pg_basebackup` or `pg_restore`.
   - Configure `recovery.conf`/`standby.signal` with `restore_command` to pull WAL from `${WAL_BUCKET}/wal/`.
   - Set `recovery_target_time` (or LSN) to the required point.
5. Start PostgreSQL; monitor recovery progress via `pg_wal_replay_pause` and `pg_last_wal_replay_lsn()`.
6. Validate:
   - Run `CHECKPOINT` and `SELECT pg_is_in_recovery();` (expect `f`).
   - Execute smoke queries defined in `ops/disaster-recovery/scripts/backup_verify.sh`.
7. Cut over traffic (update DNS/GLB) after IC approval.

## 2. Cross-Region Failover (Warm Standby Promotion)
1. Confirm primary health degradation and quorum decision (IC + DB Operator).
2. Verify standby replication state:
   - `SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_is_in_recovery();`
   - Ensure lag < RPO threshold; if lagging, stream missing WAL from object storage.
3. Promote standby:
   - `pg_ctl promote` or `SELECT pg_promote();`
   - Disable old primary connections at load balancer/security group.
4. Update traffic:
   - Swap DNS/GLB to standby endpoint with low TTL (e.g., 60s).
   - Update connection strings/secrets via config management.
5. Post-promotion validation:
   - App smoke tests, migrations, replication slots pruned.
   - Enable WAL archiving from the new primary.
6. Backfill old primary once healthy as new standby (follow `re-seed standby` in section 4).

## 3. Backup Verification Testing
1. Trigger `ops/disaster-recovery/scripts/backup_verify.sh` or wait for nightly schedule.
2. Review job logs and metrics (verification duration, checksum status).
3. Track `minimum_successful_verifications` per `config/backup-policy.yaml`; alert if below threshold.

## 4. Re-seed Standby After Failover
1. Stop old primary and wipe data directory to avoid divergence.
2. Provision fresh standby VM/instance; install matching PostgreSQL version.
3. Perform base backup from new primary: `pg_basebackup --write-recovery-conf ...`.
4. Start standby and confirm replication with `pg_stat_replication`.

## 5. Communication & Reporting
- IC posts updates every 15 minutes in incident channel.
- File post-incident review within 48 hours, including RPO/RTO achieved, gaps, and improvements.

## 6. Rollback Plan
- If new primary is unstable, execute reverse promotion: promote prior primary (if consistent) or restore from last good backup and repeat cutover.
- Maintain WAL archive continuity to preserve PITR capabilities during rollback.
