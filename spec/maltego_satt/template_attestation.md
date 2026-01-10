# Template Attestation (SATT)

## Attestation Inputs

- Template executable bundle.
- Metadata descriptor with license and disclosure policies.
- Signer identity and signature.

## Validation Steps

1. Verify signature against trusted signer list.
2. Compute measurement hash and compare to signed value.
3. Bind measurement hash to template registry entry.
4. Emit compliance decision log for approval or rejection.

## Outputs

- Attestation record stored in witness ledger.
- Policy decision reference for template authorization.
