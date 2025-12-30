# Key Management Runbook

**Goal:** Secure handling of Encryption and Signing keys.

## Storage
*   **Production:** AWS KMS / HashiCorp Vault.
*   **Development:** Local Sealed Secrets (GitOps).

## Key Rotation
1.  **Trigger:** Annual rotation or suspected compromise.
2.  **Procedure:**
    a.  Generate new Key Version (KV) in KMS.
    b.  Update Application Config to use new KV for *encryption*.
    c.  Application retains ability to *decrypt* with old KV.
    d.  Run `re-encrypt` job to migrate data (lazy or batch).
    e.  Archive old KV after verification.

## Access Control
*   Only `production-service-role` has `kms:Decrypt`.
*   DevOps Leads have `kms:Admin` (Break-glass only).

## Incidents
*   **Key Compromise:** Immediately revoke key. Trigger "Emergency Re-key" protocol (Service downtime required).
