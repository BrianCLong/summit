# Policy Enforcement Runbook

## Overview
This runbook describes the unified policy enforcement system.
The system uses a single `PolicyEvaluator` to make deterministic `ALLOW`/`DENY` decisions across Release Gates, Sync Boundary, and Local Store operations.

## Architecture
- **Evaluator:** `server/src/policy/policyEvaluator.ts`
- **Contract:** `server/src/policy/types.ts`
- **Report Generator:** `scripts/ci/build_policy_evidence_report.ts`
- **Policy Source:** `release-policy.yml` (and internal TS logic for now)

## Action Catalog

| Action | Context Required | Policy Source |
|--------|------------------|---------------|
| `release.promotion.verify` | `timestamp`, `targetEnv`, `override` | `release-policy.yml` (Freeze) |
| `release.deps.evaluate` | TBD | Internal / OPA |
| `sync.push` | `deviceStatus` | Internal (Revocation Check) |
| `sync.attachments.chunk` | `dataSize` | Internal (Quota) |
| `localstore.rotate` | `operatorFlag` | Internal (Safety) |

## Reason Codes and Remediation

| Reason Code | Meaning | Remediation |
|-------------|---------|-------------|
| `RELEASE_FROZEN` | Current time is within a freeze window | Wait for window to close or provide override |
| `FREEZE_OVERRIDE_INVALID_REASON` | Override reason too short | Provide a longer reason |
| `MISSING_EVIDENCE_PACK` | GA promotion requires evidence | Build evidence pack first |
| `DEVICE_REVOKED` | Device is revoked | Re-enroll device |
| `QUOTA_EXCEEDED` | Data size exceeds limit | Reduce size or request quota increase |
| `OPERATOR_FLAG_REQUIRED` | Dangerous op requires flag | Add `--force` or equivalent flag |

## How to Update Policies
1. **Freeze Windows:** Edit `release-policy.yml` in the root.
2. **Logic/Rules:** Update `server/src/policy/policyEvaluator.ts`.
3. **Test Vectors:** Add new vectors to `scripts/ci/build_policy_evidence_report.ts` (or `ci/policy-test-vectors/*.json` when moved to files).

## Adding Test Vectors
To ensure coverage, add a new entry to `DEFAULT_VECTORS` in `scripts/ci/build_policy_evidence_report.ts`:
```typescript
{
  name: 'New Scenario',
  context: { action: '...', ... },
  expectedDecision: 'DENY'
}
```

## Rollback / Risk
If the unified evaluator causes issues:
- **Release:** Manually check `scripts/release/check-freeze.mjs` (the logic is ported from there, so it should match).
- **Sync/LocalStore:** The wiring is currently minimal. Revert the code changes that call `PolicyEvaluator`.
