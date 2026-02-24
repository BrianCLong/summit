# Tooling Agent Drift Monitoring

## Scope
Monitor deterministic behavior of the tooling agent artifacts (`report.json`, `metrics.json`, `stamp.json`).

## Command
```bash
python3 scripts/monitoring/tooling-agent-drift.py --task example --out artifacts/drift_report.json
```

## Expected Output
- `artifacts/drift_report.json`
- `drift_detected=false` for healthy deterministic runs.

## Triage
1. Re-run `node scripts/ci/tooling_agent_check.mjs`.
2. Verify prompt/template files were not changed without schema updates.
3. Check `agents/tooling_agent.py` for nondeterministic fields.
