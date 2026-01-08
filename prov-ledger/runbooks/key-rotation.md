# Key Rotation Runbook

## Overview

This runbook details the procedure for rotating the Ed25519 signing keys used by the Prov-Ledger service.

## Procedure

1.  **Generate new Keypair**
    - Generate a new Ed25519 keypair.
    - Store the private key securely (e.g., in a secrets manager).

2.  **Add as Secondary Signer**
    - Deploy the new public key to the service configuration.
    - Configure the service to dual-sign manifests with both the old and new keys.
    - Maintain this state for 7 days to ensuring propagation.

3.  **Promotion and Revocation**
    - After 7 days, promote the new key to be the primary signer.
    - Remove the old key from the active signing set.
    - Revoke the old key in the JWKS (JSON Web Key Set) endpoint.
    - Rotate the verifier trust set in all consumer services.

## Verification

- Verify that new signatures are valid against the new public key.
- Verify that old signatures are still verifiable (if retention policy allows) or rejected as expected.
