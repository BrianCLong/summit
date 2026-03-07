# companyOS Contract (v1 foundation)

## Authority
companyOS is the authoritative tenant/org layer for org facts, roles, entitlements, budgets, and policy evaluation decisions.

## Read contract
- `getOrg(orgId)` returns canonical org identity and display metadata.
- `getPolicies(orgId)` returns org-scoped policy rules consumed read-only by Summit runtime modules.

## Evaluate contract
`evaluate(context)` must return:
- `decisionId` (deterministic hash)
- `allowed` (boolean)
- `reasons` (string[])
- `policyIds` (string[])

## Required `PolicyContext` fields
- `orgId`
- `actorId`
- `action`

Optional enforcement fields:
- `flowId`, `jobId`, `toolName`, `repo`, `tokenEstimate`, `riskTier`

## Enforcement invariants
- Deny-by-default when policy does not explicitly allow.
- Missing `orgId` or `actorId` produces deny decision.
- Decision IDs exclude timestamps.
