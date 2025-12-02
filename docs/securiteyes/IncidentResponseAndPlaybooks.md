# Securiteyes Incident Response

Defensive playbooks for managing incidents.

## Lifecycle

1.  **Detected**: Automated alert generated.
2.  **Triage**: Analyst reviews validity and severity.
3.  **Contained**: Immediate threat stopped (e.g., token revocation).
4.  **Eradicated**: Root cause removed (e.g., vulnerability patched).
5.  **Recovered**: Systems returned to normal.
6.  **Lessons Learned**: Post-mortem.

## Playbooks (Defensive Only)

*   **Credential Compromise**: Force MFA, Rotate Keys, Lock Account.
*   **Data Exfiltration**: Block IP, Revoke Access, Snapshot Evidence.
*   **Insider Threat**: Increased Monitoring, HR/Legal Review (Human-in-the-loop).

## Evidence Bundles

The `IncidentManager` can generate a cryptographically verifiable (future work) bundle of all graph nodes and logs related to an incident for audit purposes.
