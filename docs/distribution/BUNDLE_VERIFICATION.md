# Bundle Verification

This document describes the offline bundle verifier added for Wave N. The verifier checks file hashes and an optional placeholder signature to ensure bundles are intact before distribution or install.

## Overview

- **Scope:** Offline verification of bundles produced by the packaging workflow.
- **Inputs:**
  - `manifest.json` (read for presence only; structural validation belongs to the manifest schema task)
  - `hashes.json` describing `sha256` digests for each bundled file
  - Optional `signature.json` placeholder that signs `hashes.json`
- **Outputs:** Pass/fail status plus detailed error messages for each mismatch.
- **Determinism:** Uses deterministic hashing and a repeatable placeholder signature check for reproducible results.

## Placeholder Signature Format

`signature.json` uses a deterministic placeholder format—no real PKI required. Fields:

- `algorithm` – a descriptive string (e.g., `dev-placeholder-sha256`).
- `keyId` – identifier for the dev key used in tests.
- `target` – must be `"hashes.json"`.
- `signature` – base64-encoded SHA-256 hash of the string `"<algorithm>:<keyId>:<sha256(hashes.json)>"`.

Because the signature is derived only from public inputs, verification is deterministic and offline friendly.

## Running the Verifier

Use `ts-node` to run the verifier against a bundle directory:

```bash
pnpm ts-node scripts/bundle/verify.ts <path-to-bundle>
```

- The command fails with a non-zero exit code if any hash mismatch or signature issue is detected.
- Add `signature.json` to bundles to enable signature checks; pass `requireSignature: true` programmatically to enforce it.

## Programmatic Usage

```ts
import { verifyBundle } from "../scripts/bundle/verify";

const result = verifyBundle("/path/to/bundle", { requireSignature: true });
if (!result.ok) {
  console.error(result.errors);
}
```

## Non-goals / Out of Scope

- Real cryptographic signing or PKI integration (placeholder only).
- Schema validation of `manifest.json` (handled by the manifest schema task).
- Networked verification or marketplace integration.
