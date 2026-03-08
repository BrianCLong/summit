# Policy Modes (Observe / Assist / Autopilot)

## Purpose

Policy modes define how much autonomy the agent receives. All modes are policy-enforced and deny-by-default.

## Observe

- **Behavior**: No external side effects. Observations only.
- **Use cases**: Exploration, summarization, analysis.
- **Policy stance**: Read-only; deny any tool or connector with side effects.

## Assist

- **Behavior**: Suggests actions and prepares drafts; requires explicit user approval for execution.
- **Use cases**: Drafting responses, staging automations.
- **Policy stance**: Limited tool access; approvals required per action.

## Autopilot

- **Behavior**: Executes pre-approved workflows within strict limits.
- **Use cases**: Repetitive, low-risk tasks (eg, inbox triage).
- **Policy stance**: Only for workflows with explicit approval; scope + budget enforced.

## Mode Escalation Rules

- Autopilot requires an approved workflow and explicit policy allowlist.
- Mode changes are recorded in receipts.
- Any policy denial forces fallback to Assist.

## UX Expectations

- Users see the current mode in the Trust Dashboard.
- Every policy decision shows a short explanation and rule reference.
