# Secrets Governance Guardrail

**Status:** Active
**Mechanism:** Static Analysis Script

To ensure the [Secrets Lifecycle Rules](./SECRETS_LIFECYCLE.md) are respected, we enforce a consistent guardrail.

## The Guardrail: `scripts/security/detect_secrets.cjs`

This script is the **single source of truth** for what constitutes a "detectable secret" in this repository.

### Rules of Engagement

1.  **Mandatory Pass:** All PRs must pass this check.
2.  **Zero Exceptions:** If the script flags a file, it must be fixed.
    *   **True Positive:** Remove the secret.
    *   **False Positive:** Add the file or pattern to the `IGNORE_FILES` list in the script itself (requires Code Owner review).
3.  **No Configuration Drift:** The configuration (regex patterns, ignores) is contained within the script file, ensuring the check is portable and version-controlled.

### Execution

The guardrail is executed:
*   **Locally:** By developers before commit.
*   **CI:** As a blocking step in the Security pipeline.

```bash
# Verify the guardrail
node scripts/security/detect_secrets.cjs
```
