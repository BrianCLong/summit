# Voice Clone Governance Policy

## Overview
Summit requires explicit, verifiable consent for any voice cloning operations.
This policy is enforced at the runtime level via the `require_consent` gate.

## Consent Proof
A `consent_proof` is a mandatory field for the `voice:clone` API.
Currently supported attestations:
- `I_HAVE_RIGHTS_ATTESTATION_V1`: Explicit attestation that the user holds the necessary legal rights to clone the voice.

## Enforcement
- **Deny-by-default**: Any request missing a valid `consent_proof` will be rejected with a `PermissionError`.
- **Audit Logging**: All clone requests, including the provided consent proof and model metadata, are recorded in the audit logs (redacted of raw audio).

## Misuse Prevention
Unauthorized cloning is a violation of the Summit Code of Conduct and may lead to account suspension.
