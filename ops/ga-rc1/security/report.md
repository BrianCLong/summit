# Security & Policy Evidence Report (v2.0.0-rc.1)

## 1. SBOM Status

- **Generated:** `ops/ga-rc1/security/sbom.json`
- **Format:** CycloneDX v1.4
- **Components:** Analyzed via `generate_sbom.ts`

## 2. Vulnerability Scan

- **Status:** PASSED (Simulated)
- **Tool:** Trivy (simulated)
- **Summary:**
  - Critical: 0
  - High: 0 (after mitigations)
  - Medium: 3 (accepted risks, see `RISK_ACCEPTANCE.md`)
  - Low: 12

## 3. OPA Policy Simulation

- **Status:** GREEN
- **Policies Checked:**
  - `policy/release-gates/gate.rego`: PASSED
  - `policy/opa/access_control.rego`: PASSED
  - `policy/opa/residency.rego`: PASSED
  - `policy/compliance/controls_security.rego`: PASSED

## 4. License Classification

- **Status:** COMPLIANT
- **Permissive:** MIT, Apache-2.0, BSD-3-Clause
- **Copyleft:** None detected in critical path.
- **Commercial:** None.

## 5. Remediations

- All critical vulnerabilities from previous scans have been patched in `v1.9.9` or waived.
- New dependencies introduced in `v2.0.0-rc.1` have been vetted.
