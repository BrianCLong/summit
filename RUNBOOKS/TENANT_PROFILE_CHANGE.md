# Tenant Profile Change Runbook

This runbook governs moving a tenant between profiles without code forks. All changes must align
with the Summit Readiness Assertion and be recorded as governed exceptions when needed.

## 1) Pre-Change Assessment

1. Identify the current and target profiles.
2. Compare risk thresholds, GA requirements, and incident expectations.
3. Document deltas and approval requirements.

## 2) Update Overlays

1. Adjust overlay policies in `policies/tenants/<profile>.yml`.
2. Ensure the target profile reflects tighter guardrails where required.
3. Resolve policies and regenerate artifacts.

## 3) Re-Run Governance Checks

Run the following with the target profile:

```bash
node scripts/tenants/resolve_policies.mjs --tenant-profile <target_profile>
node scripts/risk/validate_change_risk.mjs --tenant-profile <target_profile> --risk-report <risk-report.json> --channel prod
node scripts/ops/rollback_drill.js --tenant-profile <target_profile>
node scripts/release/plan_ga_cut.mjs --tenant-profile <target_profile> --dry-run true
```

## 4) Approvals

- Secure all required signoffs listed in the target profile's GA overlay.
- Log the change in governance records.

## 5) Execute Change

1. Update deployment overlays to target the new profile.
2. Confirm observability settings match the target profile requirements.
3. Validate all artifacts are stored under `artifacts/tenants/`.

**Finality:** The profile change is complete only when the resolved policy artifacts, risk
validation, incident drill evidence, and GA cut plan outputs are approved and archived.
