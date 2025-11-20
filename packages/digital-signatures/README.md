# @intelgraph/digital-signatures

PKI infrastructure and digital signature management for authentication and non-repudiation.

## Features

- **Key Generation**: ECDSA (secp256k1) and RSA (2048-bit) support
- **Digital Signatures**: Sign and verify data with multiple algorithms
- **Certificate Management**: X.509-style certificates with revocation
- **Multi-Signature**: Threshold signatures for critical operations
- **PKI Infrastructure**: Complete public key infrastructure

## Installation

```bash
pnpm add @intelgraph/digital-signatures
```

## Usage

### Generate Key Pair

```typescript
import { PKIManager } from '@intelgraph/digital-signatures';
import pino from 'pino';

const pki = new PKIManager(pino());

// ECDSA (recommended for blockchain)
const ecdsaKeys = pki.generateECDSAKeyPair();
console.log('Public key:', ecdsaKeys.publicKey);

// RSA (for compatibility)
const rsaKeys = pki.generateRSAKeyPair(2048);
```

### Sign and Verify (ECDSA)

```typescript
const data = JSON.stringify({ message: 'Hello, World!' });

// Sign
const signature = pki.signECDSA(data, ecdsaKeys.privateKey);

// Verify
const isValid = pki.verifyECDSA(data, signature, ecdsaKeys.publicKey);
console.log('Signature valid:', isValid);
```

### Sign and Verify (RSA)

```typescript
const signature = pki.signRSA(data, rsaKeys.privateKey);
const isValid = pki.verifyRSA(data, signature, rsaKeys.publicKey);
```

### Issue Certificate

```typescript
const issuerKeys = pki.generateECDSAKeyPair();

const certificate = pki.issueCertificate(
  'user@example.com',
  'IntelGraph CA',
  ecdsaKeys.publicKey,
  365, // Valid for 1 year
  issuerKeys.privateKey // Sign with issuer's key
);

console.log('Certificate ID:', certificate.id);
```

### Verify Certificate

```typescript
const result = pki.verifyCertificate(certificate.id);

if (result.valid) {
  console.log('Certificate is valid');
} else {
  console.log('Certificate errors:', result.errors);
}
```

### Multi-Signature

```typescript
// Create multi-signature (2-of-3 threshold)
const key1 = pki.generateECDSAKeyPair();
const key2 = pki.generateECDSAKeyPair();
const key3 = pki.generateECDSAKeyPair();

const multiSig = pki.createMultiSignature(
  data,
  [key1.privateKey, key2.privateKey, key3.privateKey],
  2 // Threshold: 2 out of 3 required
);

// Verify multi-signature
const isValid = pki.verifyMultiSignature(
  data,
  multiSig.signatures,
  multiSig.publicKeys,
  multiSig.threshold
);
```

### Revoke Certificate

```typescript
pki.revokeCertificate(certificate.id, 'Key compromised');

// Check revocation
const isRevoked = pki.isCertificateRevoked(certificate.id);
```

## License

MIT
