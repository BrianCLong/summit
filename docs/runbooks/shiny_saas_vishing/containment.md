# Containment Runbook: ShinyHunters-Branded SaaS Data Theft

## Overview
This runbook provides steps to contain an incident involving SaaS data theft initiated via vishing and credential harvesting.

## Immediate Actions
1. **Revoke Active Sessions**:
   - Terminate all active sessions for the compromised user in the IdP (Okta, Entra ID).
   - Force re-authentication across all integrated SaaS applications.
2. **Revoke OAuth Authorizations**:
   - Review and revoke any recently granted OAuth tokens or application consents for the user.
   - Pay close attention to broad scopes like `Files.Read.All` or admin report access.
3. **Disable Compromised Accounts**:
   - Temporarily disable the user account if active exfiltration is detected.
4. **Pause MFA Enrollment**:
   - Temporarily pause self-service MFA registration for the organization or the affected user group to prevent attackers from re-enrolling devices.
5. **Restrict Password Resets**:
   - Limit self-service password resets, especially for administrative accounts.

## Evidence Collection
- Preserve IdP logs (sign-in, MFA changes).
- Preserve SaaS audit logs (SharePoint, Salesforce, Workspace).
- Document any identified look-alike domains.
