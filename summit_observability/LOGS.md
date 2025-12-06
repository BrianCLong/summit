# Logs

Summit maintains structured logs for auditing and debugging.

## Log Structure

Logs are stored in JSON format in the configured `logs_dir`.

```json
{
  "timestamp": "ISO-8601",
  "level": "INFO|WARN|ERROR",
  "component": "orchestrator|agent|governance",
  "flow_id": "uuid",
  "agent_id": "agent_name",
  "message": "Human readable message",
  "context": {
    "key": "value"
  }
}
```

## Log Categories

1. **System Logs**: Orchestrator startup, config loading, system health.
2. **Flow Logs**: Execution steps, state transitions.
3. **Agent Logs**: Reasoning traces (if enabled), tool usage, outputs.
4. **Audit Logs**: Governance decisions, security events.
