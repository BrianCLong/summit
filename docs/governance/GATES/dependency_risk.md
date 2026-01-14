# Dependency Risk Gate

**Type:** Supply Chain | **Blocking:** Yes (Critical/High)

## Purpose
Prevents the introduction of vulnerable or malicious dependencies.

## Mechanism
*   **Tool:** `pnpm audit`
*   **Trigger:** `dependency-audit` workflow.
*   **Policy:** Blocks on `Critical` or `High` vulnerabilities.

## Failure Response
1.  **Update:** Upgrade the dependency to a patched version.
2.  **Mitigate:** If no patch exists, determine if the vulnerability is reachable.
3.  **Waiver:** If unreachable, file a Governance Exception and add to `audit-resolutions.json` (or equivalent).
