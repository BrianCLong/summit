# Secrets Detection & Prevention

**Status:** Active
**Owner:** Jules (Secrets Lifecycle Owner)

This document outlines the posture for detecting and preventing secrets from entering the codebase.

## 1. Existing Checks

We employ a "defense in depth" approach using lightweight local checks and CI/CD gates.

| Check Type | Tool | Command | Scope |
| :--- | :--- | :--- | :--- |
| **Local / Pre-Commit** | `detect_secrets.cjs` | `node scripts/security/detect_secrets.cjs` | Scans current directory for regex patterns (keys, tokens). |
| **CI / Gate** | `detect_secrets.cjs` | (Defined in `ci-security.yml` or equivalent) | Blocks PRs/Merges if patterns are found. |
| **Deep Scan** | `gitleaks` (Optional) | `scripts/security/verify_no_secrets.sh` | Scans full git history (requires binary). |
| **Dependency Scan** | `trivy` / `snyk` | (Via CI Workflows) | Scans dependencies for known hardcoded secrets (rare). |

## 2. How to Run Locally

### Lightweight Scan (Recommended)
This runs the same logic as the repo guardrail. It checks for common patterns like AWS keys, Private Keys, and generic API tokens.

```bash
node scripts/security/detect_secrets.cjs
```

**Expected Output:**
```
🔍 Scanning for secrets...
✅ No secrets found.
```

### Deep History Scan
If you have `gitleaks` installed, you can scan the entire history.

```bash
./scripts/security/verify_no_secrets.sh
```

## 3. Known Gaps

*   **Obfuscated Secrets:** The regex scanners cannot detect secrets that are split, reversed, or heavily obfuscated (e.g., base64 encoded strings that don't look like keys).
*   **Custom/Proprietary Formats:** Vendor-specific keys that do not follow standard patterns (like `sk-` or `AKIA`) may be missed.
*   **Binary Files:** Secrets hidden inside compiled binaries or images are not scanned by the lightweight script.

## 4. Incident Escalation

If a secret is detected in the repository (even in history):

1.  **Do NOT delete the file immediately.** The history remains.
2.  **Rotate the Secret:** Assume it is compromised. Revoke it at the provider source immediately.
3.  **Purge History:** Use `git filter-repo` or BFG Repo-Cleaner to remove the artifact from git history.
4.  **Refer to IR Docs:** Follow the [Incident Response Playbook](../runbooks/SECURITY_INCIDENT_RESPONSE.md) (or equivalent).
