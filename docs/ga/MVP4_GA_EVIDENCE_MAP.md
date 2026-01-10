# MVP4 GA Evidence Map

**Status:** Active
**Last Updated:** MVP4 GA

This map links the governance artifacts required for MVP4 GA readiness, specifically focusing on Security and Secrets Management.

## Security & Secrets Governance

| Capability | Artifact | Evidence Location | Verification Command |
| :--- | :--- | :--- | :--- |
| **Secrets Inventory** | [Secrets Surface Inventory](../secrets/SECRETS_INVENTORY.md) | `docs/secrets/SECRETS_INVENTORY.md` | `cat docs/secrets/SECRETS_INVENTORY.md` |
| **Lifecycle Policy** | [Secrets Lifecycle Rules](../secrets/SECRETS_LIFECYCLE.md) | `docs/secrets/SECRETS_LIFECYCLE.md` | N/A (Policy) |
| **Detection Posture** | [Detection & Prevention](../secrets/SECRETS_DETECTION_AND_PREVENTION.md) | `docs/secrets/SECRETS_DETECTION_AND_PREVENTION.md` | `node scripts/security/detect_secrets.cjs` |
| **Governance Gate** | [Governance Guardrail](../secrets/SECRETS_GOVERNANCE.md) | `docs/secrets/SECRETS_GOVERNANCE.md` | `node scripts/security/detect_secrets.cjs` |

## Detection Capabilities

*   **Local Check:** `node scripts/security/detect_secrets.cjs` (Lightweight, Regex-based)
*   **Deep Scan:** `scripts/security/verify_no_secrets.sh` (Full History, requires Gitleaks)
*   **Dependency Scan:** `npm audit` / Snyk (CI only)

## Remediation

See [Secrets Detection & Prevention > Incident Escalation](../secrets/SECRETS_DETECTION_AND_PREVENTION.md#4-incident-escalation).
