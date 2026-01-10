# Evidence Attestation

This module provides a mechanism to sign and verify evidence bundle manifests to ensure integrity and authenticity.

## Overview

The attestation system supports multiple signer types:
1.  **none** (Default): No cryptographic signature. A hash-based integrity check is performed.
2.  **ed25519**: Uses Ed25519 digital signatures.

## Configuration

To enable Ed25519 signing, you must set the environment variable:
`EVIDENCE_SIGNING_ENABLED=true`

If this flag is false or unset, attempts to use the `ed25519` signer will fail.

## Usage

### Signing

```typescript
import { signManifest } from 'src/evidence/attestation/sign';

const manifest = { ... };
const signature = await signManifest(manifest, {
    signerType: 'ed25519',
    privateKey: '...pem...'
});
```

### Verifying

```typescript
import { verifyManifest } from 'src/evidence/attestation/verify';

const isValid = await verifyManifest(manifest, signature, {
    signerType: 'ed25519',
    publicKey: '...pem...'
});
```

## Security

*   **None Signer**: Provides *no* security against active attackers. It only ensures the manifest hasn't been accidentally corrupted if the signature travels with it. It essentially acts as a checksum.
*   **Ed25519 Signer**: Provides strong cryptographic guarantees of authenticity and integrity, assuming the private key is kept secret.
*   **Key Management**: This module does NOT handle key storage (KMS). Keys must be retrieved from a secure store and passed to the functions.

## Future Work

*   Integration with AWS KMS or HashiCorp Vault.
*   Canonical JSON serialization (RFC 8785) to ensure consistent signing across different platforms/runtimes.
