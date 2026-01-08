# Runbook: Security Incidents

## 1. Symptoms

- **Alert:** `MassiveAuthFailures` (SEV-1), `PolicyDenialSpike` (SEV-2)
- **Report:** Vulnerability report, suspicious activity report.
- **Logs:** Unexpected IP addresses accessing admin endpoints.

## 2. Immediate Containment

1.  **Block IP/User:**
    ```bash
    # Add IP to deny list
    ./scripts/incident/containment.sh --action block_ip --ip <ip_address>
    # Suspend user account
    ./scripts/ops/suspend-user.ts --user-id <id>
    ```
2.  **Rotate Secrets (If Leaked):**
    Initiate secret rotation for affected credentials.
    ```bash
    ./scripts/security/rotate-keys.sh
    ```
3.  **Enable Change Freeze:**
    Prevent new code from complicating the analysis.
    ```bash
    ./scripts/enable-freeze.sh
    ```

## 3. Diagnostics

- **Audit Logs:**
  Review `audit_events` table for actions by the suspect.
  ```sql
  SELECT * FROM audit_events WHERE actor_id = '...' AND created_at > NOW() - INTERVAL '1 hour';
  ```
- **WAF Logs:**
  Check Cloudflare/AWS WAF logs for attack patterns.

## 4. Mitigation

- **Patch Vulnerability:**
  If code exploit, hotfix immediately.
- **Invalidate Sessions:**
  Force logout for all users or affected group.
  ```bash
  ./scripts/ops/revoke-sessions.ts --all
  ```

## 5. Escalation

- **MANDATORY:** Escalate to **CISO/Security Lead** immediately for any SEV-1 security event.
- Notify **Legal** if PII breach is confirmed.

## 6. Post-Incident

1.  Preserve logs (Forensics).
2.  Complete mandatory breach notification assessment.
3.  Update WAF rules and OPA policies.
