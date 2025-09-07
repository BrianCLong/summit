# PITR Drill Playbook

1. Identify latest base backup and WAL range (Aurora: use automated backups; Patroni: WAL-G list).
2. Restore to a temp cluster/namespace.
3. Set recovery_target_time in postgresql.auto.conf.
4. Start DB; verify recovery stopping at target.
5. Run smoke tests; capture evidence to WORM bucket.
