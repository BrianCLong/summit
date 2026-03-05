# Runbook: Autonomous Engineer v2

## Replay Procedure
1. Set `SUMMIT_AUTON_ENGINEER=1` in sandbox-only environments.
2. Rehydrate deterministic artifacts from `artifacts/*.json`.
3. Re-run CI gate scripts in order: plan -> patch policy -> eval.
4. Confirm deterministic artifacts remain byte-stable.

## Failure Modes
- Policy failure: `check_patch_policy` returns non-zero.
- Plan invalid: `check_plan_gate` returns non-zero.
- Eval threshold miss: `check_eval_min_score` returns non-zero.
- Tool budget exceeded: runner raises `BudgetExceededError`.

## Escalation
- Agent stuck: terminate run and reset to last known-good artifacts.
- Tool budget exceeded: reduce scope and rerun with constrained step list.

## Rollback
Set `SUMMIT_AUTON_ENGINEER=0` to disable the lane.
