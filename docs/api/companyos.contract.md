# companyOS Contract (v1 Foundation)

## Purpose
Define the authoritative tenant/org policy contract that Summit Core, Switchboard, and Maestro consume.

## Ownership
- **Contract authority**: companyOS
- **Consumers**: Summit Core, Switchboard, Maestro
- **Evidence authority**: IntelGraph

## Canonical Entities
- `Org`
- `Account`
- `Role`
- `Membership`
- `Entitlement`
- `Budget`
- `Policy`
- `Decision`

## Required Read APIs
- `getOrg(orgId)`
- `getPolicies(orgId)`
- `evaluate(context)`

## PolicyContext (minimum required fields)
- `orgId` (required)
- `actorId` (required)
- `action` (required)
- `toolName` (required for tool actions)
- `flowId` (required for flow actions)
- `jobId` (required for job actions)
- `tokenEstimate` (required for budget-scoped actions)
- `riskTier` (optional v1, enforced in v2 lanes)

## Decision Contract
- `decisionId` deterministic hash of policy inputs excluding timestamps
- `allowed` boolean
- `reasons[]` human-readable policy outcomes
- `policyIds[]` applicable policy references

## Enforcement Rule
All actions are deny-by-default unless a policy explicitly allows execution.
