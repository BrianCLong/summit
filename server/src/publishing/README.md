# Proof-Carrying Publishing

End-to-end proof-carrying publishing system for IntelGraph that ensures every export includes verifiable evidence of data lineage, transforms, licenses, and citations.

## Features

### ✅ Verifiable Manifests

Every export bundles a **proof-carrying manifest** containing:

- **Hash Tree**: Merkle tree for cryptographic verification of bundle integrity
- **Model Cards**: Complete data lineage and transformation history
- **Citations**: Required attributions with verification status
- **License Terms**: SPDX-compliant license information

### ✅ Audience-Scoped Evidence Wallets

The **Disclosure Packager** creates targeted evidence bundles:

- **Access Control**: Role, organization, and user-based scoping
- **Sensitivity Levels**: Public, internal, confidential, restricted
- **Geographic Restrictions**: Regional access controls
- **Time-Bounded**: Validity windows and expiration

### ✅ Offline Verification

Bundles include standalone verification scripts:

- **No Network Required**: Complete offline verification
- **Multiple Formats**: Bash and Node.js verification scripts
- **Tamper Detection**: Cryptographic proof of integrity
- **Human-Readable**: Clear verification reports

### ✅ Revocation System

Distributed revocation with propagation:

- **Wallet Revocation**: Revoke specific evidence wallets
- **Bundle Revocation**: Revoke all wallets for a bundle
- **Propagation**: Automatic distribution to registries
- **Offline Lists**: Exportable revocation lists for air-gapped environments

### ✅ Citation Validation

Publishing is **blocked** if required citations are missing:

- **Required Citations**: Must be verified before publishing
- **License Compatibility**: Automatic detection of incompatible licenses
- **Verification Tracking**: Manual, automated, and registry-based verification
- **Validation Pipeline**: Pre-publish gates prevent incomplete exports

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Proof-Carrying Publisher                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Hash Tree    │  │ Model Card   │  │   Citation      │  │
│  │   Builder     │  │  Generator   │  │   Validator     │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Disclosure   │  │  Revocation  │  │     Bundle      │  │
│  │   Packager    │  │   Registry   │  │    Verifier     │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   Evidence Wallet (.zip)  │
              ├───────────────────────────┤
              │ • manifest.json           │
              │ • evidence-wallet.json    │
              │ • verify.sh / verify.js   │
              │ • public-key.pem          │
              │ • artifacts/              │
              │ • README.md               │
              └───────────────────────────┘
```

## Usage

### Basic Publishing

```typescript
import { ProofCarryingPublisher, StandardLicenses } from './publishing';

// Initialize publisher with keys
const publisher = new ProofCarryingPublisher({
  privateKey: process.env.PRIVATE_KEY,
  publicKey: process.env.PUBLIC_KEY,
  organization: 'IntelGraph',
  contact: 'security@intelgraph.ai',
});

// Publish a bundle
const result = await publisher.publish({
  name: 'IntelGraph Export 2024-01',
  description: 'Q1 Intelligence Data Export',
  version: '1.0',
  createdBy: 'analyst@intelgraph.ai',
  artifacts: ['/path/to/data.json', '/path/to/metadata.json'],
  citations: [
    {
      id: 'osint-db',
      type: 'data',
      required: true,
      title: 'OSINT Database',
      organization: 'IntelGraph',
      license: StandardLicenses['Apache-2.0'],
      verified: true,
      verifiedAt: new Date().toISOString(),
    },
  ],
  licenses: [StandardLicenses['Apache-2.0']],
  complianceFrameworks: ['GDPR', 'CCPA'],
  securityClassification: 'confidential',
});

if (!result.validation.canPublish) {
  console.error('Publishing blocked:', result.validation.blockers);
  process.exit(1);
}

console.log('Published bundle:', result.manifest.bundleId);
```

### Creating Audience-Scoped Wallets

```typescript
import { AudienceScopes } from './publishing';

// Create wallet for public audience
const publicWallet = await publisher.createWalletForAudience(
  result.manifest,
  AudienceScopes.public(),
  ['/path/to/public-data.json'],
  './public-wallet.zip'
);

// Create wallet for internal team
const internalWallet = await publisher.createWalletForAudience(
  result.manifest,
  AudienceScopes.internal('IntelGraph'),
  ['/path/to/internal-data.json', '/path/to/analysis.json'],
  './internal-wallet.zip'
);

// Create wallet for restricted audience
const restrictedWallet = await publisher.createWalletForAudience(
  result.manifest,
  AudienceScopes.restricted(
    'IntelGraph',
    ['analyst@intelgraph.ai'],
    ['TOP_SECRET']
  ),
  ['/path/to/classified-data.json'],
  './restricted-wallet.zip'
);
```

### Verifying Bundles

```typescript
// Verify bundle
const verification = await publisher.verifyBundle(
  result.manifest,
  './artifacts'
);

if (verification.valid) {
  console.log('✓ Bundle is valid');
  console.log('Verification duration:', verification.verificationDuration, 'ms');
} else {
  console.error('✗ Bundle verification failed');
  console.error('Errors:', verification.errors);
}

// Generate human-readable report
const verifier = new BundleVerifier();
const report = verifier.generateReport(verification);
console.log(report);
```

### Offline Verification

Recipients can verify bundles without network access:

```bash
# Extract wallet
unzip evidence-wallet.zip
cd evidence-wallet

# Verify using bash (requires openssl, sha256sum)
./verify.sh

# Or verify using Node.js
node verify.js
```

### Revoking Bundles

```typescript
// Revoke specific wallet
await publisher.revokeWallet(
  wallet,
  'compromised',
  'security-team@intelgraph.ai',
  'Security incident detected'
);

// Revoke entire bundle (revokes all wallets)
await publisher.revokeBundle(
  result.manifest.bundleId,
  'withdrawn',
  'admin@intelgraph.ai',
  'Data quality issues discovered'
);

// Export revocation list for offline verification
await publisher.exportRevocationList('./revocations.json');
```

### Citation Management

```typescript
import { CitationValidator, StandardLicenses } from './publishing';

const validator = new CitationValidator();

// Register citations
validator.registerCitation({
  id: 'dataset-1',
  type: 'data',
  required: true,
  title: 'Open Source Intelligence Database',
  organization: 'IntelGraph',
  url: 'https://intelgraph.ai/datasets/osint',
  license: StandardLicenses['CC-BY-4.0'],
  verified: false,
});

// Verify citation
await validator.verifyCitation('dataset-1', 'automated');

// Validate for publishing
const validation = validator.validateForPublishing(citations);

if (!validation.canPublish) {
  console.error('Cannot publish due to:');
  validation.blockers.forEach(blocker => console.error('  -', blocker));
  console.error('\nMissing citations:');
  validation.missingCitations.forEach(cit =>
    console.error('  -', cit.title, `(${cit.id})`)
  );
}
```

## Database Schema

The system includes comprehensive database tables:

- **`proof_carrying_manifests`**: Complete manifest storage
- **`evidence_wallets`**: Audience-scoped wallet metadata
- **`revocation_records`**: Revocation tracking with propagation status
- **`citation_registry`**: Central citation management
- **`verification_history`**: Audit trail of all verifications

See `migrations/020_proof_carrying_publishing.sql` for full schema.

## Key Functions

### Database Functions

```sql
-- Check if bundle can be published
SELECT * FROM can_publish_bundle('bundle-id');

-- Get revocation status
SELECT * FROM get_revocation_status(
  p_bundle_id := 'bundle-id',
  p_wallet_id := NULL
);
```

### Views

- **`active_manifests`**: Non-revoked, non-expired manifests
- **`active_wallets`**: Valid wallets for current time
- **`verification_stats`**: Daily verification statistics
- **`revocation_stats`**: Revocation tracking by reason
- **`citation_completeness`**: Citation status per bundle

## Acceptance Criteria

### ✅ Bundle Verifies Offline

Every exported bundle includes:

- Standalone verification scripts (Bash + Node.js)
- Public key for signature verification
- Complete hash tree for integrity checks
- Clear instructions in README.md

**No network access required for verification.**

### ✅ Revocation Propagates

Revocation records are:

- Signed and timestamped
- Propagated to configured registries
- Exportable for offline environments
- Automatically applied to all wallets in a bundle

**Revocation status is queryable and persistent.**

### ✅ Publish Blocked on Missing Citations

Publishing pipeline validates:

- All required citations are present
- Required citations are verified
- Licenses are compatible
- No prohibited licenses are used

**Publishing fails fast with clear error messages.**

## Testing

Comprehensive test suite covers:

- Hash tree building and verification
- Model card generation and validation
- Citation validation and license compatibility
- Evidence wallet creation and packaging
- Revocation and propagation
- End-to-end publishing workflow
- Offline verification

Run tests:

```bash
npm test src/publishing/__tests__/proof-carrying-publishing.test.ts
```

## Security Considerations

1. **Key Management**: Private keys should be stored in KMS (AWS KMS, HashiCorp Vault)
2. **Key Rotation**: Support for key rotation with transition periods
3. **Algorithm Choice**: RSA-SHA256 (default), ECDSA-SHA256, or Ed25519
4. **Revocation Checking**: Always check revocation status before using bundles
5. **Signature Verification**: All signatures must be verified before trust

## License

This proof-carrying publishing system is part of IntelGraph and is licensed under the IntelGraph license terms.

## References

- **SLSA**: Supply-chain Levels for Software Artifacts
- **SPDX**: Software Package Data Exchange
- **Merkle Trees**: Cryptographic hash trees for integrity
- **Model Cards**: Documentation for ML models and datasets
- **Evidence Wallets**: Verifiable credential bundles
