# Runbook: Switchboard Command Execution Failing

## Trigger
- Command execute error rate p99 > 0.5%.
- Alert: `SwitchboardCommandExecutionFailures`.

## Impact
Commands fail to execute or enqueue, blocking operational workflows.

## Triage Steps
1. Check command execution service logs for validation errors.
2. Inspect queue health and enqueue latency.
3. Validate policy decisions are returned and not timing out.

## Mitigations
- Restart command execution worker pool.
- Drain and reprocess failed enqueue messages.
- Apply temporary deny receipts for commands that cannot enqueue.

## Verification
- Error rate returns below 0.5%.
- Timeline entries show receipts within 2s.
