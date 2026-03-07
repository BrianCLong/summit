# Switchboard Runtime Policy Contract (v1 Foundation)

## Purpose
Define policy enforcement for flow and tool execution under companyOS governance.

## Inputs
- Flow/tool request metadata with `orgId`, `actorId`, and `action` (`FLOW_RUN` or `TOOL_INVOKE`).
- Required identifiers: `flowId` for flow runs, `toolName` for tool invocation.

## Enforcement Behavior
1. Evaluate policy context before runtime execution.
2. Deny if organization context is absent.
3. Deny if target tool is not allowlisted by org policy.
4. Deny if budget guard conditions are unmet.
5. Proceed only when `allowed=true` and attach `decisionId` to execution metadata.

## Evidence Behavior
- Emit `policy.decision` and `flow.run` records.
- Produce deterministic artifact bundle and index entry for each decision.

## Kill Switch
- `COMPANYOS_ENFORCE=0`: advisory mode for phased rollout.
- `COMPANYOS_ENFORCE=1`: enforce deny-by-default behavior.
