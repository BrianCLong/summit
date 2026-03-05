# Autonomous Engineer v2 Standard

## North Star
CI-native autonomous engineering where every action is planned, policy-checked, test-verified, evidence-linked, and replayable.

## Import / Export Matrix
| System concept | Summit import | Summit export |
| --- | --- | --- |
| Dyad planning questionnaire | `agents/preflight/*` | `artifacts/run_plan.json` |
| Dyad persistent todos | `agents/ledger/*` | `artifacts/execution_ledger.json` |
| Cursor multi-surface triggers | `integrations/*` (future) | webhook events (future) |
| Claude Code CLI loop | `scripts/summit-agent` (future) | command logs + evidence |
| Devin ticket→plan→test→PR | `agents/loop/*` (future) | PR-ready patch stack |

## Deterministic Artifact Contract
Deterministic artifacts must not include wall-clock timestamps:
- `artifacts/run_plan.json`
- `artifacts/execution_ledger.json`
- `artifacts/patch_stack.json`
- `artifacts/eval_report.json`
- `artifacts/policy_report.json`
- `artifacts/metrics.json`

`artifacts/stamp.json` is explicitly non-deterministic and reserved for wall-clock metadata.

## Feature Flag
`SUMMIT_AUTON_ENGINEER=0` is default-off until all gates are green in sandbox mode.
