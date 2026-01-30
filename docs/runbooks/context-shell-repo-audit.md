# Context Shell Runbook: Policy Gates for Release Workflows

## Purpose

Locate policy gates that impact release workflows using the Context Shell tools,
while producing evidence-grade logs for audit trails.

## Preconditions

- Maestro Context Shell tools registered (`ctx.bash`, `ctx.readFile`).
- Repository checked out at the target commit.
- Evidence logging enabled (default writes to `evidence/context-shell/`).

## Workflow

1. **Identify release workflow definitions**

   ```bash
   ctx.bash('rg "release" .github/workflows')
   ```

2. **Find policy enforcement points in release automation**

   ```bash
   ctx.bash('rg "policy|guard|gate" server/src/ scripts/ .github/')
   ```

3. **Inspect specific policy routes and controls**

   ```bash
   ctx.bash('rg "policy" server/src/conductor/api')
   ctx.readFile('server/src/conductor/api/policy-routes.ts')
   ```

4. **Capture evidence output**

   Evidence logs are written automatically as JSONL events to
   `evidence/context-shell/`. Attach the JSONL artifact to your evidence bundle.

## Expected Evidence

- `tool_call_start` and `tool_call_end` entries for each command.
- `policyDecisionId` fields showing allow/deny evaluations.
- `filesRead` and `filesWritten` lists tied to each tool call.

## Escalation

If policy denial blocks required paths, log the denial and escalate to governance
for a policy update. Use the existing policy-as-code workflow to change
allowlists/denylists.
