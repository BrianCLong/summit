# Runbook: Evidence Signing Key Rotation

## Summit Readiness Assertion
This runbook is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## Trigger Conditions
- Scheduled quarterly rotation window.
- Verified key compromise signal.
- Policy bundle update that changes signer allowlists.

## Preconditions
- Current policy bundle digest is recorded in the Evidence Store.
- New key material is provisioned in KMS/HSM or Sigstore identity is ready.
- Rollback plan documented in the release ticket.

## Procedure
1. Generate new key or identity.
2. Update signer allowlist in policy bundle and sign the bundle.
3. Deploy policy bundle update and verify policy digest propagation.
4. Issue a canary evidence bundle and validate signature verification.
5. Promote rotation to all tenants.
6. Revoke prior key and record revocation event in Evidence Store.

## Validation
- Release gate accepts evidence signed with the new key.
- Old keys are rejected after revocation.

## Rollback
- Re-enable prior key in policy allowlist.
- Roll back to previous policy bundle digest.
- Re-run validation evidence bundle.
