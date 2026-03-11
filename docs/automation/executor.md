# SAFE_AUTOMATION Executor and Log

The SAFE_AUTOMATION Executor is a tightly constrained, minimal component that performs the actual automated actions when the `AutomationRouter` determines it is safe to do so.

## Whitelisted Actions

To prevent abuse and limit blast radius, the Executor only supports a small, strictly whitelisted set of internal, non-destructive actions. Currently, these include:

-   `ADD_TO_WATCHLIST`: Adds a persona or campaign to an internal tracking list.
-   `RAISE_INTERNAL_CASE`: Opens an internal investigation record for a given subject.
-   `TUNE_DETECTION_THRESHOLD`: Adjusts an internal detection threshold within allowed bounds.
-   `TAG_PERSONA_HIGH_RISK`: Tags a persona as high risk internally.

These actions do not interact with external systems or touch production credentials.

## Execution Workflow

When `execute_if_allowed` is called:
1.  It queries the `AutomationRouter`.
2.  If the decision is `MANUAL_ONLY` or `NEEDS_APPROVAL`, it returns a failure status and logs the reason.
3.  If the decision is `AUTO_EXECUTE_OK`, it looks up the specific internal function for that action class and executes it.

## Execution Log

Every execution attempt—whether it succeeds, fails, or is blocked by governance/risk—is recorded in the `AutomationExecutionLog` (an append-only JSONL file).

The log captures:
- `execution_id` and `timestamp`
- `action_class` and `subject_type` / `subject_id`
- `risk_context` and `governance_context`
- `initiator`
- `result` (`SUCCESS`, `FAILURE`, `MANUAL_REQUIRED`, `APPROVAL_REQUIRED`)

### Reviewing Logs via CLI

Auditors can review recent automation decisions and executions using the Summit CLI:

```bash
summit automation log --limit 50
```

## Expanding Safely

To add new automated capabilities:
1.  Define a new `AutomationActionClass` in `safe_policies.py`.
2.  Add a policy in `automation_policies.yaml`.
3.  Implement a minimal, safe executor function in `executor.py`.
4.  Register the function in the `_EXECUTOR_REGISTRY`.
