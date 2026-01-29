# Security & Data Handling: Agentic Workflows

**Context:** Usage of `PLAN.md` and Agentic Policy Reports.

## 1. Classification

*   `PLAN.md`: **Internal Engineering Metadata**.
*   Policy Reports (`artifacts/agentic_policy/report.json`): **Internal Audit Log**.

## 2. Never-Log Rules

When creating plans or reviewing agent output, the following strictly applies:

1.  **No Secrets:** `PLAN.md` MUST NOT contain API keys, passwords, or customer PII.
    *   *Mitigation:* CI scanners (e.g., `gitleaks`) run on `PLAN.md` just like code.
2.  **Redaction in Reports:**
    *   The Agentic Plan Gate generates reports on changed files.
    *   These reports MUST only contain **file paths**, **line numbers**, and **rule IDs**.
    *   Code snippets in reports MUST be hashed or strictly limited to non-sensitive context.

## 3. Data Retention

*   `PLAN.md` files are committed to the repo and follow the repository's retention lifecycle.
*   CI Artifacts are retained according to GitHub Actions retention settings (typically 90 days).

## 4. Threat Model: "Rogue Agent"

*   **Risk:** Agent hallucinates a dependency on a malicious package.
*   **Defense:** Existing `Supply Chain` gates and `Review Aggressively` standard.
*   **Risk:** Agent modifies unauthorized files (e.g., `.github/workflows`).
*   **Defense:** `CODEOWNERS` requires human approval for critical paths.
