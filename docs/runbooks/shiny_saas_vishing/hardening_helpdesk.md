# Hardening Runbook: Helpdesk Verification Workflow

## Overview
Attackers use vishing to impersonate IT/Helpdesk staff. Hardening the verification process is critical to preventing initial access.

## High-Assurance Identity Verification
1. **Call-Back to Known Number**:
   - Never use a number provided during an incoming call.
   - Always call back the employee at the phone number listed in the official HR directory.
2. **Video ID Verification**:
   - Require a brief video call to verify the employee's identity against their photo on file.
3. **Manager Out-of-Band Approval**:
   - Require the employee's direct manager to approve any password reset or MFA change via a separate channel (e.g., Slack/Teams message).

## Handling Third-Party Vendor Requests
1. **Verify Identity**:
   - If a caller claims to be from a trusted vendor, hang up and call the known Account Manager contact using verified contact information.
2. **"Shields Up" Procedure**:
   - During active campaigns, implement a "no self-service" policy for MFA changes, requiring manual verification for all requests.

## Technical Controls
- Move to **phishing-resistant MFA** (FIDO2/Passkeys).
- Enforce **managed device** compliance for SaaS access.
