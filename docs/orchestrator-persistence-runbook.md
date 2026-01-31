# Runbook: Orchestrator Persistence Layer

## Overview
The orchestrator now uses PostgreSQL as its primary source of truth for runs, tasks, and events. This document describes how to monitor and maintain this infrastructure.

## Data Inspection

### Monitoring Active Runs
To see all active orchestration runs:
```sql
SELECT id, created_at, metadata FROM orchestrator_runs ORDER BY created_at DESC LIMIT 10;
```

### Inspecting Task State
To check the status of tasks for a specific run:
```sql
SELECT id, status, owner, created_at, started_at, completed_at 
FROM orchestrator_tasks 
WHERE run_id = 'RUN_ID' 
ORDER BY created_at ASC;
```

### Event Log Analysis
To view the audit trail for a run:
```sql
SELECT type, team_id, payload, created_at 
FROM orchestrator_events 
WHERE run_id = 'RUN_ID' 
ORDER BY created_at ASC;
```

## Maintenance

### Outbox Health
The `orchestrator_outbox` table handles reliable event emission. Monitor for failed events:
```sql
-- Count pending events
SELECT COUNT(*) FROM orchestrator_outbox WHERE processed_at IS NULL;

-- Identify failing events
SELECT id, topic, attempts, last_error 
FROM orchestrator_outbox 
WHERE processed_at IS NULL AND attempts > 0;
```

### Troubleshooting
1. **Stuck Tasks**: If a task is stuck in `in_progress` but the agent is dead, you can manually reset it (with caution):
   ```sql
   UPDATE orchestrator_tasks SET status = 'pending', owner = NULL WHERE id = 'TASK_ID';
   ```
2. **Outbox Retries**: If events are failing due to transient issues, the worker will retry up to the configured limit. After that, manual intervention may be needed to reset the `attempts` count or fix the underlying issue.

## Backup & Restore
Orchestrator tables are part of the main `summit` database and are included in standard SQL backups.
- **Source of Truth**: Always rely on PostgreSQL for the current state.
- **JSONL Replay**: While JSONL files were used previously, they are now secondary. In case of DB corruption, a manual migration from JSONL would be required.
