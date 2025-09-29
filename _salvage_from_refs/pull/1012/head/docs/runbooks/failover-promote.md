# Failover Promote Runbook

1. Freeze writes on primary.
2. Confirm replication catch-up.
3. Run `scripts/failover/promote_secondary.sh`.
4. Update DNS to secondary.
5. Unfreeze writes and monitor.
