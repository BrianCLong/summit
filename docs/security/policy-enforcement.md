# Policy Enforcement Baseline: companyOS v1

## Enforcement Scope
companyOS is the governance authority for tenant/org policy. Switchboard and Maestro are mandatory enforcement points. IntelGraph is evidence custody.

## Deny-by-Default Rules
- Missing `orgId` → deny.
- Missing required action context (`toolName`, `flowId`, `jobId`) → deny.
- Missing `tokenEstimate` for budget-scoped actions → deny.
- Policy absent or evaluation error → deny.

## Evidence Requirements
Every policy decision must produce:
- `report.json`
- `metrics.json`
- `stamp.json`
- `evidence/index.json`

Determinism rule: timestamps are only valid in `stamp.json`.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt manipulation to bypass checks, cross-tenant invocation, tool abuse, budget evasion, audit erasure.
- **Mitigations**: strict context validation, deny-by-default evaluator, deterministic evidence verification, run metadata linking via `decisionId`.

## Rollout Controls
- `COMPANYOS_ENFORCE=0`: controlled rollout mode.
- `COMPANYOS_ENFORCE=1`: mandatory enforcement mode.
- Per-tenant enablement should follow observed allow/deny telemetry and incident thresholds.

## Governance Finality
Policy exceptions require a governed exception record and human owner sign-off per CODEOWNERS and governance policy.
