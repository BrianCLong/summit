# PR Runbook Card

## Summary
- Restore the worker automation entrypoints so tickets can be planned and executed end-to-end.
- Introduce default worker profiles and prompt tuning metadata used by the router.

## AC Mapping
- AC1: `plan_tickets.run` returns structured assignments for incoming ticket payloads – ✅
- AC2: `execute_ticket.run` respects manual worker overrides and returns captured work product – ✅

## Gates
- ✅ Unit: `pytest` (ga-graphai/packages/worker)
- [BLOCKER] SBOM: `forge attest ga-graphai/packages/worker`

## Evidence
- ✅ `pytest` (ga-graphai/packages/worker) – see output in CI logs / local run.

## Rollback Plan
- Revert commits `13a624f0` and `a54dfed1` with `git revert` in reverse order, then redeploy.
