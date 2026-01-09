# Tenant Onboarding Runbook

This runbook defines the governed path to onboard a new Summit customer using tenant profiles.
All onboarding must align with the Summit Readiness Assertion.

## 1) Profile Selection

1. Review `configs/tenants/TENANT_PROFILES.yaml`.
2. Select the closest profile based on data classification, risk envelope, and deployment needs.
3. Document the selection in the onboarding record.

## 2) Overlay Deltas (No Forks)

1. Capture any customer-specific deltas as overlay patches in `policies/tenants/`.
2. Do **not** modify application code or base policies.
3. Label deltas as governed exceptions when deviations are required.

## 3) Resolve Policies

Run the policy resolver to generate a resolved policy artifact:

```bash
node scripts/tenants/resolve_policies.mjs --tenant-profile <profile>
```

Store the output under `artifacts/tenants/RESOLVED_POLICIES_<profile>.json`.

## 4) Risk Evaluation Sanity Check

Generate or supply the change risk report, then validate against the tenant profile:

```bash
node scripts/risk/validate_change_risk.mjs --tenant-profile <profile> --risk-report <risk-report.json> --channel prod
```

Record the validation output under `artifacts/tenants/risk-validation.json`.

## 5) Incident Drill

Run the rollback drill with tenant-specific requirements:

```bash
node scripts/ops/rollback_drill.js --tenant-profile <profile>
```

## 6) GA Readiness Dry-Run

Generate the GA cut plan for the tenant profile:

```bash
node scripts/release/plan_ga_cut.mjs --tenant-profile <profile> --dry-run true
```

## 7) Evidence Log

Attach the following artifacts to the onboarding record:

- Resolved policies
- Risk validation output
- Incident drill evidence
- GA cut plan output

**Finality:** Onboarding is complete once all artifacts are present and approved by the required
signoffs for the tenant profile.
