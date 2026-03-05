# Runbook: Autonomous Engineer V2

## How to reproduce a run from artifacts (replay)
1. Read `artifacts/run_plan.json`
2. Run `scripts/summit-agent --replay-from-plan`

## Common failure modes
- **Policy failure:** Check `artifacts/policy_report.json` for details
- **Test failure:** Agent modifications caused regression, check patch diff

## Escalation
If agent stuck: Kill process, review `artifacts/execution_ledger.json`

## SLO
Initial expectation: 95% runs produce a test-verified patch stack in sandbox mode.
