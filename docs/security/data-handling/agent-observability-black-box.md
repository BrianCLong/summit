# Agent Observability Data Handling & Security

## Redaction Policy

All observability artifacts (`trace.jsonl`, `report.json`, etc.) must pass through the `Redactor` pipeline.

### Defaults
*   **Deny-by-default**: For highly sensitive contexts, only allowlisted fields are preserved.
*   **Block-by-default**: For general contexts, known sensitive keys (`password`, `api_key`, `ssn`, `token`, `authorization`) are automatically redacted.

### Configuration
Redaction rules are configured per-agent via the `ObservableAgent` wrapper (or global config).

```python
redactor = Redactor(denylist={"my_secret_field"})
snapshot.to_dict(redactor)
```

## Storage
*   Artifacts are stored locally in `artifacts/observability/`.
*   They should NOT be committed to git if they contain real data.
*   CI artifacts are ephemeral.

## Retention
*   Trace data is retained for debugging and compliance.
*   `stamp.json` ensures integrity.
