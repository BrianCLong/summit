# BYOK / HSM Entitlement Signing

Tenants may register a signing key residing in their own KMS or HSM. The service stores only key identifiers and uses remote sign and verify APIs.

## Register
1. Provide key ID and KMS endpoint
2. Validate with test signature

## Rotate
- Upload new key ID
- Dual control approval
- Overlap window allows both keys to sign

All rotations and key IDs are recorded in the transparency log.
