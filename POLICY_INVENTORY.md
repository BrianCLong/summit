# Policy Inventory

## Policy Sources
- **Release Policy:** `release-policy.yml` (Root) - Defines freeze windows and override rules.
- **Release Gates:** `policy/release-gates.rego` - OPA policy for promotion gates (Canary/Stable/GA).
- **Invariants:** `invariants/` (if any, checked during exploration).

## Current Consumers
- **CI Scripts:** `scripts/release/check-freeze.mjs` (REPLACED by `scripts/release/gate-check.ts`).
- **OPA:** Consumes `policy/*.rego`.

## Gaps Identified & Addressed
- **Sync Boundary:** Now bridged in `server/src/websocket/core.ts` using `PolicyEvaluator`.
- **Local Store:** New script `server/src/scripts/localstore-ops.ts` demonstrates policy enforcement.
- **Evidence:** `scripts/ci/build_policy_evidence_report.ts` produces a unified "Policy Evidence Report".

## Unification Status
- `PolicyEvaluator` (TS) now bridges `release-policy.yml` and internal rules.
- `scripts/release/gate-check.ts` is the new canonical freeze check.
- `release-policy.yml` logic ported to `PolicyEvaluator`.
