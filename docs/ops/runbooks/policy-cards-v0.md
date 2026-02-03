# Runbook: Policy Cards v0

## Overview
This runbook covers operational procedures for Policy Cards v0, including validation failures, enforcement blocking, and drift detection.

## Symptoms
1.  **CI Failure**: `policy-validate` job fails in PR.
2.  **Runtime Block**: Agents report "DENY_DEFAULT" or "POLICY_VIOLATION" errors.
3.  **Drift Alert**: `policy-drift` workflow reports failure.

## Immediate Triage

### CI Failure
- Check `report.json` in artifacts.
- Verify policy syntax against schema.
- **Action**: Fix policy file or update allowed tools list.

### Runtime Block (Enforcement)
- **Log Search**: Search logs for `reason="DENY_DEFAULT"`.
- **Identify Tool**: Which tool is being blocked?
- **Decision**:
    - Is the tool valid? -> Update Policy Card to allow it.
    - Is the tool malicious/unexpected? -> Investigate Agent behavior (Security Incident).
- **Emergency Bypass**:
    - Disable `POLICY_ENFORCEMENT_ENABLED` feature flag (requires deployment/config update).

### Drift Alert
- Check `drift_report.json`.
- Compare current policy hash with known good hash.
- **Action**:
    - If intentional change: Update baseline.
    - If unauthorized change: Revert commit and investigate.

## Common Causes
- New tool added to agent but not to policy.
- Policy file edited manually with invalid syntax.
- Feature flag enabled without a valid policy file loaded (if loading implemented).

## Rollback
- To disable enforcement: Set `POLICY_ENFORCEMENT_ENABLED=false`.
- To revert policy logic: Revert `packages/policy-cards` bump.

## Evidence Collection
- Collect `evidenceId` from logs.
- Retrieve `artifacts/policy/stamp.json` from CI or Runtime storage.
