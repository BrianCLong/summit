# Runbook: Agentic Policy & Plan Gate

**Service:** Agentic Governance
**Gate Name:** `Agentic Plan Gate`

## 1. Overview

The Agentic Plan Gate enforces the [On Programming with Agents](../../standards/on-programming-with-agents.md) standard. It checks for the presence of plans and quality markers (no TODOs) in agent-generated PRs.

## 2. Troubleshooting Failures

### Error: `MISSING_PLAN`
*   **Cause:** The PR was detected as agentic (or policy requires it for all), but no `PLAN.md` or equivalent was found.
*   **Fix:** Add a `PLAN.md` file to the root of the PR, following the template in the standard.

### Error: `LEFTOVER_TODO`
*   **Cause:** The agent left `TODO` or `FIXME` comments in the modified code.
*   **Fix:** Inspect the code. If the work is incomplete, finish it. If the TODO is legitimate technical debt for later, suppress the rule or reword.

### Error: `DRIFT_DETECTED`
*   **Cause:** The `agentic-policy-drift` workflow found that the gate configuration or workflow file is missing/disabled.
*   **Fix:** Restore the `.github/workflows/agentic-plan-gate.yml` or `scripts/agentic_policy/config.json`.

## 3. Configuration

Configuration is located in `scripts/agentic_policy/config.json`.

```json
{
  "mode": "warn", // or "strict"
  "max_files": 20,
  "require_plan_for_labels": ["agentic", "ai-generated"]
}
```

*   **To Enable Blocking:** Change `"mode": "warn"` to `"mode": "strict"`.
*   **To Disable:** Set `"mode": "off"`.

## 4. Escalation

If the gate is blocking critical releases falsely:
1.  Edit `scripts/agentic_policy/config.json` to set `mode: "warn"`.
2.  Merge the config change.
3.  Re-run the PR check.
