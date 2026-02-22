# WideSeek-R1 Runbook

## Enabling
WideSeek is disabled by default. To enable:
1. Set `WIDESEEK_ENABLED=1` in environment.
2. Configure `WIDESEEK_ALLOWLIST` with comma-separated domains.

## Running
Use the CLI:
```bash
python -m summit.cli.wideseek run --query "My Task" --offline-fixtures
```

## Failure Modes
- **Policy Denial**: Check `WIDESEEK_ALLOWLIST`. Logs will show "URL denied".
- **Budget Exceeded**: Increase `MAX_SUBAGENTS` or `MAX_TURNS` if safe.
- **Injection**: Tool output blocked. Review tool source.

## Monitoring
Check `artifacts/metrics.json` for:
- `subagents_spawned`
- `tool_calls`
- `rewards`
