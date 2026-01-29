# Governance Drift Report

## Governance Checks in CI

### `ci-verify.yml`

*   **`governance-checks` Job:**
    *   `npm run check:governance`: Likely enforces governance policies.
    *   `validate-agent-contracts.ts`: Check if missing.
    *   `check-audit-exceptions.ts`: Check if missing.
    *   **Drift:** Many steps are `continue-on-error: true` or fallback to skipping if scripts are missing.

*   **`ga-evidence-completeness` Job:**
    *   Checks for `dist/evidence/${GITHUB_SHA}`.
    *   Generates a stub evidence bundle if missing (`create_stub_evidence_bundle.mjs`).
    *   Validates control evidence (`validate_control_evidence.mjs`).
    *   Generates GA evidence manifest (`generate_ga_evidence_manifest.mjs`).
    *   **Drift:** The fallback to stub evidence means completeness checks pass even if real evidence is missing. This undermines the gate.

### Missing/Orphaned Policies
*   **`governance/AGENT_GOVERNANCE.md`**: Enforced? `validate-agent-contracts.ts` is checked but often skipped.
*   **`governance/SEVERITY_LEDGER.md`**: Enforced? Not explicitly visible in CI.
*   **`policy/`**: OPA policies (`policy/maestro`) are checked (`opa check`) but strict enforcement is unclear without seeing the policy content.

### Evidence Drift
*   **`evidence-bundles/`**: Contains static artifacts.
*   **`dist/evidence/`**: Generated during CI run.
*   **Drift:** The disconnect between `ci-verify.yml` placeholders and actual evidence means the generated bundles might be incomplete or fake (stub).

## Recommendations
1.  **Strict Enforcement**: Remove `continue-on-error` from governance checks.
2.  **No Stubs**: Fail if evidence generation scripts are missing or fail.
3.  **Policy Linking**: Ensure `governance/` policies map directly to executable checks (e.g., `check:governance`).
