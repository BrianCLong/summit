# Incident Response Playbook: Data Breach

## 1. Identification

- **Triggers**:
  - Unusual outbound traffic spike.
  - Access to sensitive tables (PII, Secrets).
  - External report (Bug Bounty, User).
- **Initial Verification**:
  - Check audit logs (`auth_events`, `api_audit`).
  - Verify if the data accessed is actually sensitive.

## 2. Containment

- **Short Term**:
  - **Revoke Tokens**: Invalidate JWTs for affected users/services.
  - **Block IP**: Add IP to firewall deny list.
  - **Disable Service**: If critical, shut down the affected microservice.
- **Long Term**:
  - Patch the vulnerability.
  - Rotate all potentially compromised credentials (API keys, DB passwords).

## 3. Eradication

- Identify the root cause (e.g., SQL Injection, Leaked Key).
- Apply patches/fixes.
- Remove any backdoors (new admin users, unknown SSH keys).

## 4. Recovery

- Restore data from clean backups if integrity is compromised.
- Monitor systems closely for 48 hours.
- Restore service availability.

## 5. Lessons Learned

- Conduct Post-Mortem.
- Update threat models.
- Improve detection rules.
