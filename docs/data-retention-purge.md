# Data Retention Purge Workflow

## Purpose

This runbook defines the purge execution flow, signed manifest output, and verification steps for
retention enforcement.

## Purge Workflow

1. **Assemble purge request**
   - Define the purge window, target selectors, and retention policy references.
   - Capture the policy decision ID (OPA or equivalent) used to authorize the purge.

2. **Execute purge workflow**
   - Use `PurgeWorkflowService` to execute purge targets via an injected executor.
   - Outputs are captured in a **signed purge manifest**, a **provenance receipt**, and a
     **selective disclosure bundle**.

3. **Store evidence artifacts**
   - Persist the manifest JSON, receipt reference, and disclosure bundle in the designated evidence
     store.

4. **Verify manifest integrity**
   - Compute the canonical manifest hash using the same deterministic ordering defined in the
     workflow.
   - Verify the signature using the configured public key.

## Manifest Verification Steps

**Inputs:** purge manifest JSON and the public signing key (PEM)

1. **Canonicalize the manifest (exclude `manifestHash`, `signature`, `signerKeyId`)**
   - Use the same key-sorted JSON ordering as the purge workflow.

2. **Recompute the hash**
   - `sha256(canonical_json)` should equal `manifest.manifestHash`.

3. **Verify the signature**

```bash
# Save canonical JSON to canonical.json and signature to signature.b64
openssl dgst -sha256 \
  -verify public.pem \
  -signature <(base64 -d signature.b64) \
  canonical.json
```

## Disclosure Bundle Checks

- Ensure `disclosureBundle.manifestHash` matches the signed manifest hash.
- Confirm the receipt ID is present and corresponds to the purge event in the provenance ledger.

## Evidence Artifacts

- Signed purge manifest JSON
- Provenance receipt reference (ID + signature)
- Selective disclosure bundle

## References

- `server/src/services/data-retention/PurgeWorkflowService.ts`
- `server/src/services/ReceiptService.ts`
- `server/src/services/SigningService.ts`
