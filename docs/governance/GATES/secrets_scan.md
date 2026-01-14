# Secrets Scanning Gate

**Type:** Security | **Blocking:** Yes

## Purpose
Prevents secrets (API keys, tokens, credentials) from being committed to the codebase.

## Mechanism
*   **Tool:** Trivy / Gitleaks
*   **Trigger:** On every PR push (`secret-scan-warn` workflow).
*   **Config:** `.trivyignore` or `.gitleaks.toml`

## Failure Response
1.  **Rotate the Secret:** If a secret was committed, it is compromised. Rotate it immediately.
2.  **Rewrite History:** Remove the secret from git history (BFG Repo-Cleaner) if necessary, or squash the commit if not yet on main.
3.  **False Positive:** Add the pattern to the ignore file with a comment justifying why it is safe.
