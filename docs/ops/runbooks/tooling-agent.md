# Tooling Agent Runbook

## Failure Modes
- Schema mismatch in emitted artifacts.
- Determinism drift between repeated runs.
- Runtime budget overflow.
- Prompt-injection block status.

## Rollback
1. Set `TOOLING_AGENT_ENABLED=false`.
2. Re-run checks: `node scripts/ci/tooling_agent_check.mjs`.
3. Revert last tooling-agent change if checks remain red.

## Triage Commands
```bash
node scripts/ci/tooling_agent_check.mjs
python3 scripts/tooling/profile_agent.py --task example --enforce
python3 scripts/monitoring/tooling-agent-drift.py --task example --out artifacts/drift_report.json
```
