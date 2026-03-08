# Antigravity CI Ops Runbook

This runbook encodes the operational guardrails for the Summit CI/CD pipeline as managed by the Antigravity Operator.

## 1. Workflow Budget Rules
To prevent queue saturation and maintain velocity, the following limits apply per PR:
- **Total Workflows**: ≤ 12
- **Active (Auto-Running)**: ≤ 8
- **Path Filtering**: MANDATORY for all functional workflows.

## 2. Saturation Playbook (HEALTHY → GRIDLOCK)

| Status | Queue Depth | Action |
|--------|-------------|--------|
| **HEALTHY** | < 50 jobs | Proceed with all planned verifications. |
| **ELEVATED** | 50-100 jobs | Prioritize unit tests; defer heavy E2E or security scans. |
| **CRITICAL** | 100-200 jobs | Run ONLY changed packages; skip full-workspace builds. |
| **GRIDLOCK** | > 200 jobs | **STOP**. Cancel all non-essential runs. Post status update to Slack. |

## 3. Path-Filter Patterns
Always use the most granular path filters possible:
- `client/**` -> Client CI only.
- `server/**` -> Server CI only.
- `packages/shared/**` -> Full cascade required.

## 4. Emergency Procedures
If the queue exceeds 300 jobs (Fan-out Failure):
1. **Kill Switch**: `gh run cancel` for all non-main branches.
2. **Path Hardening**: Tighten filters to exclude `docs/` and `experimental/`.
3. **Escalation**: Notify @on-call-devops.
