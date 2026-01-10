# Trust Governance

This document describes how trust is measured and enforced in the Summit repository.

## The Trust Dashboard

We maintain a deterministic **Trust Dashboard** that aggregates critical signals from across the repository. This dashboard acts as the primary "Go/No-Go" gauge for releases and critical PRs.

### Architecture

*   **Spec:** `docs/ops/TRUST_DASHBOARD_SPEC.md`
*   **Generator:** `scripts/ops/generate_trust_dashboard.mjs`
*   **Snapshot:** `docs/ops/TRUST_DASHBOARD.md` (Optional, generated on release)

### Signals

The dashboard monitors:
1.  **Repo Hygiene:** Clean working tree, linting, typechecking.
2.  **Security:** No Open Critical/High findings in the ledger.
3.  **Governance:** Assurance contract presence, Evidence Index existence.
4.  **Consistency:** Version parity, dependency lockfile integrity.

### Enforcement

The dashboard is integrated into our workflow:

1.  **Local Check:**
    Developers can run the dashboard locally to verify their environment:
    ```bash
    node scripts/ops/generate_trust_dashboard.mjs
    ```

2.  **Release Gate:**
    The dashboard runs as a hard gate during the release process. If any "Hard Gate" signal fails, the release is blocked.

### Remediation

If the dashboard reports `FAIL`:
1.  Check the `Details` column for the failing signal.
2.  Address the root cause (e.g., fix lint errors, close security findings, commit changes).
3.  Re-run the generator to verify.

For **Security Ledger** failures, you must either:
*   Fix the vulnerability and update the ledger status to `Closed`.
*   Formally accept the risk and update the ledger disposition (if policy allows).
