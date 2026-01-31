# Governance Drift Detector Runbook

**ID**: RUNBOOK-GOV-001
**Owner**: Governance Operator
**Frequency**: Weekly (Monday AM)

## Objective
To detect and remediate unauthorized modifications to the Critical GA Governance Gates.

## Scope
The following "Governance Surfaces" are monitored for drift:

1.  **Workflow Definitions**: `.github/workflows/ga-risk-gate.yml`
2.  **Policy Configuration**: `docs/policies/trust-policy.yaml`
3.  **Enforcement Logic**: `scripts/check-ga-policy.sh`

## Drift Definition
Any modification to the Scoped Files that:
1.  Does not have an associated Governance Exemption Record (GER) or approved PR.
2.  Weakens the security posture (e.g., changing "blocking" to "advisory").
3.  Disables a check step.

## Detection Procedure

### 1. Check Git History (Last 7 Days)
Run the following command to identify changes:

```bash
git log --since="7 days ago" --name-status -- \
  .github/workflows/ga-risk-gate.yml \
  docs/policies/trust-policy.yaml \
  scripts/check-ga-policy.sh
```

### 2. Verify Integrity
If changes are found, verify they map to an approved PR with the `governance-approved` label.

## Remediation Path

### Scenario A: Unauthorized Change Detected
1.  **Revert Immediately**: Create a revert PR.
2.  **Incident**: File a P1 Governance Incident.
3.  **Audit**: Identify the actor and review their permissions.

### Scenario B: Accidental Drift (e.g., Merge Conflict Resolution)
1.  **Assess**: Check if the gate is still functional.
2.  **Fix**: Apply a patch to restore the gate logic.

### Scenario C: Emergency Bypass (Break Glass)
If a bypass was authorized for an incident:
1.  **Record**: Ensure a Post-Mortem is linked.
2.  **Restore**: Schedule the restoration of the gate immediately after the incident.

## Verification
To verify the gate is active:

```bash
./scripts/check-ga-policy.sh
```
