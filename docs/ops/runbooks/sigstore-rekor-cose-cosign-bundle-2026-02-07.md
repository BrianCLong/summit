# Runbook: Sigstore Negative-Case Smoke Gate (2026-02-07)

**Item slug:** `sigstore-rekor-cose-cosign-bundle-2026-02-07`
**Owner:** Supply Chain Verification
**Status:** Active

## Purpose

Operate and update the fail-closed Sigstore smoke gate that validates Cosign bundle mismatch handling and Rekor COSE malformed-entry 500 behavior.

## Update Minimum Versions

1. Update policy files that pin minimum versions (Cosign ≥ 2.6.2 or 3.0.4; Rekor ≥ 1.5.0).
2. Run the sigstore smoke suite locally.
3. Capture evidence artifact and attach to PR.

## Rotate Fixtures

1. Generate new bundle/rekor fixtures from upstream advisories.
2. Replace fixture contents with hashed representations.
3. Re-run smoke tests to confirm deterministic hashes.

## Failure Modes

| Failure Mode | Meaning | Operator Action |
| --- | --- | --- |
| `COSIGN_MISMATCH_ACCEPTED` | Verification succeeded on a mismatch fixture. | Fail closed; verify Cosign version and bundle verification logic. |
| `REKOR_500_NOT_FAIL_CLOSED` | Rekor 500 or timeout treated as non-fatal. | Fail closed; inspect Rekor client behavior and retry policy. |
| `UNKNOWN` | Unclassified error. | Fail closed; triage logs for root cause. |

## Rollback Plan

1. Revert the sigstore smoke harness commit.
2. Remove the CI gate step if required.
3. Validate `make smoke` remains green.
