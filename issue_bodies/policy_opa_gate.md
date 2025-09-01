### Context
Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`, `INTELGRAPH_ENGINEERING_STANDARD_V4.md`
Excerpt/why: To operate safely, especially at higher autonomy levels, all actions that modify state or deploy artifacts must be subject to a policy check. This gate is a fundamental safety requirement.

### Problem / Goal
The orchestrator currently executes tasks without a formal policy enforcement step, creating a significant security and safety risk. The goal is to integrate an OPA (Open Policy Agent) gate that evaluates every WRITE and DEPLOY action against a defined policy set.

### Proposed Approach
- Integrate the OPA SDK with the orchestrator's task execution engine.
- Before executing a task, the engine will call OPA with a context object describing the action (e.g., subject, action type, resource, parameters).
- The OPA policy will return an allow/deny decision. Denied actions will be terminated and logged to an audit trail.
- For sensitive actions, the policy will require a `reason-for-access` justification to be present in the request context.

### Tasks
- [ ] Set up a simple OPA policy in Rego for WRITE/DEPLOY actions.
- [ ] Integrate the OPA client into the task execution workflow.
- [ ] Create the data structure for the policy input context.
- [ ] Implement the pre-execution check; on deny, halt the task and log an audit event.
- [ ] Implement a mechanism to capture and pass `reason-for-access`.
- [ ] Add E2E tests for policy-denied scenarios.

### Acceptance Criteria
- Given a task with a `WRITE` action, when the OPA policy denies it, then the action is not executed and an audit event is created.
- Metrics/SLO: Policy evaluation p99 latency < 25ms.
- Tests: Unit tests for the OPA client; E2E tests demonstrating policy denial for both WRITE and DEPLOY actions.
- Observability: Logs and OTEL traces must include the OPA decision (`allow`/`deny`) and the policy version used for the check.

### Safety & Policy
- Action class: N/A (this is the enforcement mechanism itself)
- OPA rule(s) evaluated: This task implements the evaluation of all other rules.

### Dependencies
- Depends on: #<id_of_durable_store_issue>
- Blocks: Any worker that performs a WRITE or DEPLOY action.

### DOR / DOD
- DOR: OPA policy structure and initial ruleset approved.
- DOD: Merged, policy denial E2E tests are passing, runbook updated with instructions on how to manage policies.

### Links
- Code: `<path/to/orchestrator/policy>`
- Docs: `<link/to/policy/rego/files>`
