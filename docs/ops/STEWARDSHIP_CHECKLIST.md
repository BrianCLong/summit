# Stewardship Checklist

This checklist provides a set of recurring, verifiable tasks to ensure the Summit platform remains in a state of sustainable, trustworthy operation. All checklist items must reference a command or a file.

## Weekly Checks

- **[ ] Review Security Ledger for New Criticals**
  - **File:** `docs/security/SECURITY-ISSUE-LEDGER.md`
  - **Purpose:** Ensure any new `CRITICAL` or `P0` vulnerabilities are immediately addressed.
  - **Command:** `cat docs/security/SECURITY-ISSUE-LEDGER.md | grep "CRITICAL"`

- **[ ] Review Trust Dashboard for Anomalies** (Not yet implemented)
  - **File:** N/A
  - **Purpose:** Monitor key health and trust metrics for deviations from the baseline.
  - **Command:** N/A

## Monthly Checks

- **[ ] Review Risk Ledger for Sunsets and New Risks**
  - **File:** `docs/RISK_LEDGER.md`
  - **Purpose:** Review the status of existing risks, determine if any can be retired ("sunset"), and identify any new systemic risks.
  - **Command:** `cat docs/RISK_LEDGER.md`

- **[ ] Review Integrity Budgets Trend** (Not yet implemented)
  - **File:** N/A
  - **Purpose:** Analyze the trend of integrity budget consumption to preemptively address areas of concern.
  - **Command:** N/A

- **[ ] Review Repo Hygiene and CI Stability**
  - **File:** `AGENTS.md`
  - **Purpose:** Ensure CI performance is within acceptable limits and repo standards are being upheld.
  - **Command:** Review CI pass/fail rates in the GitHub Actions dashboard.

## Per-Release Checks

- **[ ] Verify Release Bundle** (Not yet implemented)
  - **File:** N/A
  - **Purpose:** Ensure the release bundle is complete, correctly signed, and free of tampering.
  - **Command:** N/A

- **[ ] Run GA Drift Sentinel** (Not yet implemented)
  - **File:** N/A
  - **Purpose:** Check for any unauthorized or unintended changes in paths that are frozen for a GA release.
  - **Command:** N/A

- **[ ] Verify Evidence Map** (Not yet implemented)
  - **File:** N/A
  - **Purpose:** Ensure that all claims made in the release are backed by verifiable evidence.
  - **Command:** N/A

- **[ ] Confirm Readiness Assertion is Still Valid**
  - **File:** `docs/SUMMIT_READINESS_ASSERTION.md`
  - **Purpose:** A final check to confirm that the state of the system aligns with the public declaration of readiness.
  - **Command:** `cat docs/SUMMIT_READINESS_ASSERTION.md`
