# Summit Operations Runbook

## Common Issues

### CDC Lag Increasing
**Symptoms:** Projection lag > 30 seconds, stale data in graph

**Diagnosis:**
```bash
# Check replication slot lag
psql -c "SELECT slot_name, confirmed_flush_lsn, pg_current_wal_lsn() - confirmed_flush_lsn AS lag FROM pg_replication_slots;"

# Check consumer status
curl http://localhost:4000/health/cdc
```

**Resolution:**
1. Scale CDC consumers: `kubectl scale deployment/cdc-consumer --replicas=5`
2. Check for blocking transactions: `SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';`
3. Increase consumer batch size in config

### Agent Stuck in Quarantine
**Symptoms:** Tasks not completing, quarantine queue growing

**Diagnosis:**
```bash
# Check quarantine queue
curl http://localhost:4000/api/agents/quarantine | jq '.count'

# View specific quarantined task
summit agents quarantine view <task-id>
```

**Resolution:**
1. Review evidence quality issues
2. Manual approval: `summit agents quarantine approve <task-id>`
3. Retrain agent or adjust ATF criteria
```
