# Policy Bundles & Drift Detection

## Overview
This runbook describes the lifecycle of signed policy bundles, from creation to runtime verification and drift detection.

## Policy Bundle Structure
The policy bundle is a deterministic artifact located in `dist/policy-bundle/`. It contains:
- `bundle.json`: The manifest listing all policy files, their hashes, and metadata.
- `policies/`: A directory containing the actual policy files (Rego, YAML, etc.).
- `hashes/checksums.sha256`: Checksum of the manifest.
- `signatures/bundle.sig`: RSA-SHA256 signature of the manifest.
- `signatures/public-key.pem`: Public key for verification (dev/test only, in production this should be injected or rotated).

## Building the Bundle
To build a fresh policy bundle from the source (`policy/` directory):

```bash
npx tsx scripts/ci/build_policy_bundle.ts
```

This script:
1. Collects all files from `policy/`.
2. Deterministically sorts them.
3. Generates `dist/policy-bundle/`.
4. Signs the bundle using `keys/policy-signing-key.pem`.
5. Updates `policy-bundle.lock` with the content hash.

## Verifying the Bundle
To verify the integrity and signature of a bundle:

```bash
npx tsx scripts/verification/verify_policy_bundle.ts
```

This script checks:
- `bundle.json` schema and hash.
- RSA signature against the public key.
- Hash integrity of every file in `policies/`.

## Drift Detection
Drift occurs when the source policy files change but the bundle has not been rebuilt/updated.

### CI Drift Check
The `scripts/ci/detect_policy_drift.ts` script builds a temporary manifest representation and compares its content hash against `policy-bundle.lock`.

```bash
npx tsx scripts/ci/detect_policy_drift.ts
```

If drift is detected:
1. Run `npx tsx scripts/ci/build_policy_bundle.ts`.
2. Commit the updated `policy-bundle.lock` and `dist/policy-bundle/` (if committed).

### Runtime Verification
The server uses `BundleLoader` to load policies. It performs:
1. Signature verification on startup.
2. Integrity checks on file access.

If verification fails, the server will refuse to load the policies, effectively blocking startup or policy evaluation depending on the strictness level.

## Key Rotation
For dev/test, keys are in `keys/`.
To rotate:
1. Generate new keys:
   ```bash
   openssl genpkey -algorithm RSA -out keys/policy-signing-key.pem -pkeyopt rsa_keygen_bits:2048
   openssl rsa -in keys/policy-signing-key.pem -pubout -out keys/policy-public-key.pem
   ```
2. Rebuild the bundle: `npx tsx scripts/ci/build_policy_bundle.ts`.
3. Distribute the new public key to consumers (if not embedded).

## Rollout Strategy
1. **Report-Only**: Deploy bundle, log verification failures but allow loading.
2. **Enforced**: Configure server to throw errors on verification failure.
3. **Drift Blocking**: Fail CI pipelines if drift is detected.
