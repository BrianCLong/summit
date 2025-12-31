# Regulatory Compliance Profiles

Profiles enable region-specific defaults through configuration—not code forks. Each profile is a declarative JSON/YAML payload consumed by deployment automation and validated in CI.

## Profile Matrix

| Profile           | Region / Regime       | Key Settings                                                                                                                             | Enforcement                                                         |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `soc2-us-default` | US (SOC 2 Type II)    | Audit logging required; retention ≥ 180 days; provenance ledger sink mandatory; change approvals via CODEOWNERS; smoke tests gated.      | CI validation + runtime fail-closed if sink/retention disabled.     |
| `iso-eu-default`  | EU/UK (ISO/IEC 27001) | Residency flag required; audit logging required; retention ≥ 365 days; supplier attestation attachment expected; same guardrails as SOC. | CI validation + runtime fail-closed if residency/retention missing. |

## Configuration Schema (excerpt)

```yaml
profile: soc2-us-default
settings:
  residency: none # options: none|us|eu|custom
  retention_days: 180
  audit_logging: required
  provenance_sink: required
  change_approvals: codeowners
  supplier_attestations: optional
```

## Validation & Drift Detection

- **CI check:** `scripts/regulatory/export_evidence.ts --validate-profile <profile>` ensures required keys are present, values meet minima, and fail-closed flags are set. Integrate this command into CI to block misconfigured deployments.
- **Runtime guardrails:** Deployers must render the profile into environment variables/Helm values; services refuse to start if `provenance_sink` or `audit_logging` are disabled.
- **Drift alerts:** The export script records the active profile snapshot (`profile.json`) in each evidence bundle; a change without a corresponding CI record is flagged as drift.

## Shared Responsibility & Out-of-Scope Items

- Physical security and personnel training are customer/provider responsibilities; evidence packs reference cloud attestations rather than duplicating controls.
- Customer-managed keys or BYOK/HSM setups remain optional add-ons but must be declared in the profile when used.

## How to Apply a Profile

1. Choose the profile that matches the region/regime.
2. Render the profile into deployment values (e.g., Helm/Terraform variables).
3. Run `pnpm exec ts-node scripts/regulatory/export_evidence.ts --regime <regime> --from <start> --to <end> --profile <profile>` to capture the configuration snapshot with evidence.
4. Attach the generated `profile.json` and `gaps.json` (if any) to the release record.
