# Approvals (M-of-N)

Schema

- Rules: `approvals_rule(run_id, step_id, required, approvers[])` — migration `V8__create_approvals_rule.sql`.
- Decisions: `approvals(run_id, step_id, user_id, verdict, reason)` — migration `V9__create_approvals.sql`.

Behavior

- `approveStep`/`declineStep` record decisions; an event is emitted to `run_event`.
- Steps unblock when `count(approved) >= required` for the rule.

UI

- Approvals page lists BLOCKED steps; Slack interactive buttons also supported.
