# Orchestration Troubleshooting Guide

## Overview

This runbook provides troubleshooting steps for the Maestro Orchestration system. Maestro uses BullMQ for task queues and PostgreSQL for state persistence.

## Common Issues

### 1. Stuck Runs

**Symptoms:**
- A run remains in `RUNNING` state for an extended period without progress.
- No logs are being generated for the run.

**Diagnosis:**
1. Check the `runs` table in PostgreSQL:
   ```sql
   SELECT id, status, current_step, updated_at FROM runs WHERE status = 'RUNNING';
   ```
   If `updated_at` is older than the timeout threshold (default 1h), the run is likely stuck.
2. Check the BullMQ queue status in Redis:
   - Use Redis CLI or a GUI to inspect the `maestro:queue` keys.
   - Check for stalled jobs.

**Resolution:**
- **Restart the Orchestrator:**
  ```bash
  npm run maestro:restart
  ```
- **Manually Fail/Retry:**
  Update the run status to `FAILED` or `RETRY` in the database to trigger the recovery mechanism.
  ```sql
  UPDATE runs SET status = 'FAILED', failure_reason = 'Stalled' WHERE id = 'RUN-ID';
  ```

### 2. Task Execution Failures

**Symptoms:**
- Specific steps in a workflow fail repeatedly.
- Error logs indicate "Worker timeout" or "Connection refused".

**Diagnosis:**
- Check the worker logs for the specific step type.
- Verify connectivity to dependent services (e.g., ML Inference, Database).

**Resolution:**
- Increase the timeout for the specific step type in the workflow definition.
- Verify the health of the downstream service.

### 3. Queue Congestion

**Symptoms:**
- New runs are queued but not starting.
- High latency in task processing.

**Diagnosis:**
- Monitor the queue length metric `maestro_queue_length`.
- Check worker CPU/Memory usage.

**Resolution:**
- Scale up the number of worker pods/instances.
- Check for "poison pill" tasks that are crashing workers.

## Debugging Tools

- **Maestro CLI:** Use `maestro inspect <run-id>` to view detailed run state.
- **Redis Inspector:** Inspect BullMQ state directly.

## Escalation

If issues persist, contact the Platform Engineering team at `#platform-support`.
