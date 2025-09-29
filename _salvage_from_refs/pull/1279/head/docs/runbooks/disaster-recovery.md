# Disaster Recovery Drill — Postgres & Neo4j

Targets
- RTO: ≤ 60 minutes
- RPO: ≤ 5 minutes

Checklist
1) Quiesce writes; snapshot ER queue length.
2) Restore latest full backup + WAL to T-5m.
3) Point apps to replica; run synthetic NLQ probes.
4) Declare recovery complete; reconcile ER queue; file post-mortem.

Validation
- Nightly `pg_verifybackup` and periodic restore-to-temp.
- Neo4j consistency check after restore.
- Evidence captured to WORM bucket with retention.

