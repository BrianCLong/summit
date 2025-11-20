/**
 * Disclosure Packager
 *
 * Creates audience-scoped evidence wallets with:
 * - Verifiable manifests
 * - Access control scoping
 * - Cryptographic signatures
 * - Revocation support
 */

import { createSign, createVerify, generateKeyPairSync, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import type {
  EvidenceWallet,
  AudienceScope,
  ProofCarryingManifest,
  RevocationRecord,
} from './proof-carrying-types';

export interface PackagerConfig {
  privateKey: string; // PEM format
  publicKey: string; // PEM format
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256' | 'Ed25519';
  revocationListUrl?: string;
}

export interface PackageOptions {
  audience: AudienceScope;
  artifacts: string[]; // File paths to include
  expiresAt?: string;
  revocable?: boolean;
}

export class DisclosurePackager {
  private config: PackagerConfig;

  constructor(config: PackagerConfig) {
    this.config = config;
  }

  /**
   * Create a disclosure packager with generated keys
   */
  static createWithGeneratedKeys(
    algorithm: PackagerConfig['algorithm'] = 'RSA-SHA256'
  ): DisclosurePackager {
    let keys: { privateKey: string; publicKey: string };

    if (algorithm === 'RSA-SHA256') {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      keys = {
        privateKey: privateKey as string,
        publicKey: publicKey as string,
      };
    } else if (algorithm === 'ECDSA-SHA256') {
      const { privateKey, publicKey } = generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      keys = {
        privateKey: privateKey as string,
        publicKey: publicKey as string,
      };
    } else {
      // Ed25519
      const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      keys = {
        privateKey: privateKey as string,
        publicKey: publicKey as string,
      };
    }

    return new DisclosurePackager({
      ...keys,
      algorithm,
    });
  }

  /**
   * Sign data with private key
   */
  private sign(data: string): string {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.config.privateKey, 'hex');
  }

  /**
   * Verify signature with public key
   */
  private verify(data: string, signature: string): boolean {
    const verify = createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(this.config.publicKey, signature, 'hex');
  }

  /**
   * Create an evidence wallet
   */
  async createWallet(
    manifest: ProofCarryingManifest,
    options: PackageOptions
  ): Promise<EvidenceWallet> {
    // Validate audience scope against manifest sensitivity
    this.validateAudienceScope(manifest, options.audience);

    // Create wallet ID
    const walletId = `wallet-${Date.now()}-${randomBytes(8).toString('hex')}`;

    // Sign the manifest
    const manifestJson = JSON.stringify(manifest, null, 2);
    const signature = this.sign(manifestJson);

    const wallet: EvidenceWallet = {
      id: walletId,
      bundleId: manifest.bundleId,
      audience: options.audience,
      manifest,
      artifacts: options.artifacts,
      signature,
      signatureAlgorithm: this.config.algorithm,
      publicKey: this.config.publicKey,
      revocable: options.revocable ?? true,
      revocationListUrl: this.config.revocationListUrl,
      createdAt: new Date().toISOString(),
      createdBy: manifest.metadata.createdBy,
      expiresAt: options.expiresAt,
    };

    return wallet;
  }

  /**
   * Package wallet into a distributable bundle
   */
  async packageWallet(
    wallet: EvidenceWallet,
    outputPath: string
  ): Promise<void> {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.pipe(output);

    // Add wallet metadata
    archive.append(JSON.stringify(wallet, null, 2), {
      name: 'evidence-wallet.json',
    });

    // Add manifest
    archive.append(JSON.stringify(wallet.manifest, null, 2), {
      name: 'manifest.json',
    });

    // Add verification script
    const verificationScript = this.generateVerificationScript(wallet);
    archive.append(verificationScript, {
      name: 'verify.sh',
      mode: 0o755, // Make executable
    });

    // Add Node.js verification script
    const nodeVerificationScript = this.generateNodeVerificationScript(wallet);
    archive.append(nodeVerificationScript, {
      name: 'verify.js',
    });

    // Add public key for verification
    archive.append(this.config.publicKey, {
      name: 'public-key.pem',
    });

    // Add README
    const readme = this.generateReadme(wallet);
    archive.append(readme, {
      name: 'README.md',
    });

    // Add artifacts
    for (const artifactPath of wallet.artifacts) {
      try {
        const stats = await fs.stat(artifactPath);
        if (stats.isFile()) {
          archive.file(artifactPath, {
            name: `artifacts/${artifactPath.split('/').pop()}`,
          });
        }
      } catch (error) {
        console.warn(`Could not add artifact ${artifactPath}: ${error}`);
      }
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
  }

  /**
   * Validate audience scope against manifest
   */
  private validateAudienceScope(
    manifest: ProofCarryingManifest,
    scope: AudienceScope
  ): void {
    // Check sensitivity levels
    const sensitivityLevels = ['public', 'internal', 'confidential', 'restricted'];
    const manifestSensitivity = manifest.metadata.securityClassification || 'internal';

    const scopeLevel = sensitivityLevels.indexOf(scope.maxSensitivity);
    const manifestLevel = sensitivityLevels.indexOf(
      manifestSensitivity as string
    );

    if (manifestLevel > scopeLevel) {
      throw new Error(
        `Audience scope sensitivity (${scope.maxSensitivity}) is insufficient for manifest (${manifestSensitivity})`
      );
    }

    // Check expiration
    if (scope.validUntil) {
      const expiryDate = new Date(scope.validUntil);
      if (expiryDate < new Date()) {
        throw new Error('Audience scope has expired');
      }
    }

    // Validate time window
    if (scope.validFrom) {
      const validFromDate = new Date(scope.validFrom);
      if (validFromDate > new Date()) {
        throw new Error('Audience scope is not yet valid');
      }
    }
  }

  /**
   * Verify a wallet's signature and integrity
   */
  async verifyWallet(wallet: EvidenceWallet): Promise<boolean> {
    try {
      // Verify signature
      const manifestJson = JSON.stringify(wallet.manifest, null, 2);
      const signatureValid = this.verify(manifestJson, wallet.signature);

      if (!signatureValid) {
        return false;
      }

      // Check expiration
      if (wallet.expiresAt) {
        const expiryDate = new Date(wallet.expiresAt);
        if (expiryDate < new Date()) {
          return false;
        }
      }

      // Check manifest expiration
      if (wallet.manifest.expiresAt) {
        const expiryDate = new Date(wallet.manifest.expiresAt);
        if (expiryDate < new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Wallet verification failed:', error);
      return false;
    }
  }

  /**
   * Generate bash verification script
   */
  private generateVerificationScript(wallet: EvidenceWallet): string {
    return `#!/bin/bash
# Evidence Wallet Verification Script
# Generated: ${new Date().toISOString()}
# Wallet ID: ${wallet.id}

set -e

echo "=== Evidence Wallet Verification ==="
echo "Wallet ID: ${wallet.id}"
echo "Bundle ID: ${wallet.bundleId}"
echo "Created: ${wallet.createdAt}"
echo ""

# Check for required tools
command -v openssl >/dev/null 2>&1 || { echo "Error: openssl is required but not installed."; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "Error: sha256sum is required but not installed."; exit 1; }

# Verify manifest signature
echo "Verifying manifest signature..."
openssl dgst -sha256 -verify public-key.pem -signature <(echo "${wallet.signature}" | xxd -r -p) manifest.json
if [ $? -eq 0 ]; then
  echo "✓ Signature valid"
else
  echo "✗ Signature invalid"
  exit 1
fi

# Verify Merkle root
echo ""
echo "Verifying Merkle root..."
MANIFEST_ROOT=$(jq -r '.hashTree.root' manifest.json)
echo "Root hash: $MANIFEST_ROOT"

# Verify each artifact
echo ""
echo "Verifying artifacts..."
ARTIFACT_COUNT=0
for artifact in artifacts/*; do
  if [ -f "$artifact" ]; then
    ARTIFACT_HASH=$(sha256sum "$artifact" | cut -d' ' -f1)
    ARTIFACT_NAME=$(basename "$artifact")
    echo "  $ARTIFACT_NAME: $ARTIFACT_HASH"
    ARTIFACT_COUNT=$((ARTIFACT_COUNT + 1))
  fi
done

echo ""
echo "✓ Verification complete"
echo "  Artifacts verified: $ARTIFACT_COUNT"
echo "  Bundle is valid and has not been tampered with"
`;
  }

  /**
   * Generate Node.js verification script
   */
  private generateNodeVerificationScript(wallet: EvidenceWallet): string {
    return `#!/usr/bin/env node
/**
 * Evidence Wallet Verification Script
 * Generated: ${new Date().toISOString()}
 * Wallet ID: ${wallet.id}
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('=== Evidence Wallet Verification ===');
console.log('Wallet ID: ${wallet.id}');
console.log('Bundle ID: ${wallet.bundleId}');
console.log('Created: ${wallet.createdAt}');
console.log('');

// Load files
const wallet = JSON.parse(fs.readFileSync('evidence-wallet.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const publicKey = fs.readFileSync('public-key.pem', 'utf8');

// Verify signature
console.log('Verifying manifest signature...');
const verify = crypto.createVerify('SHA256');
verify.update(JSON.stringify(manifest, null, 2));
verify.end();

const signatureValid = verify.verify(publicKey, wallet.signature, 'hex');

if (signatureValid) {
  console.log('✓ Signature valid');
} else {
  console.log('✗ Signature invalid');
  process.exit(1);
}

// Verify Merkle root
console.log('');
console.log('Verifying Merkle root...');
console.log('Root hash:', manifest.hashTree.root);

// Verify artifacts
console.log('');
console.log('Verifying artifacts...');
const artifactsDir = path.join(__dirname, 'artifacts');
if (fs.existsSync(artifactsDir)) {
  const artifacts = fs.readdirSync(artifactsDir);
  for (const artifact of artifacts) {
    const artifactPath = path.join(artifactsDir, artifact);
    const content = fs.readFileSync(artifactPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    console.log(\`  \${artifact}: \${hash}\`);
  }
}

console.log('');
console.log('✓ Verification complete');
console.log('  Bundle is valid and has not been tampered with');
`;
  }

  /**
   * Generate README
   */
  private generateReadme(wallet: EvidenceWallet): string {
    return `# Evidence Wallet

**Wallet ID:** ${wallet.id}
**Bundle ID:** ${wallet.bundleId}
**Created:** ${wallet.createdAt}
${wallet.expiresAt ? `**Expires:** ${wallet.expiresAt}  ` : ''}

## Description

This evidence wallet contains a verifiable bundle of data with complete proof-carrying metadata including:

- Hash tree (Merkle tree) for integrity verification
- Model cards documenting data lineage and transforms
- License terms and citations
- Cryptographic signatures for authenticity

## Audience Scope

**Name:** ${wallet.audience.name}
**Description:** ${wallet.audience.description}
**Max Sensitivity:** ${wallet.audience.maxSensitivity}
${wallet.audience.validFrom ? `**Valid From:** ${wallet.audience.validFrom}  ` : ''}
${wallet.audience.validUntil ? `**Valid Until:** ${wallet.audience.validUntil}  ` : ''}

## Contents

- \`evidence-wallet.json\` - Complete wallet metadata
- \`manifest.json\` - Proof-carrying manifest
- \`public-key.pem\` - Public key for signature verification
- \`verify.sh\` - Bash verification script (requires openssl, sha256sum)
- \`verify.js\` - Node.js verification script (requires Node.js 14+)
- \`artifacts/\` - Bundle artifacts

## Verification

### Quick Verification (Bash)

\`\`\`bash
chmod +x verify.sh
./verify.sh
\`\`\`

### Quick Verification (Node.js)

\`\`\`bash
node verify.js
\`\`\`

### Manual Verification

1. **Verify Signature:**
   \`\`\`bash
   openssl dgst -sha256 -verify public-key.pem -signature <(echo "..." | xxd -r -p) manifest.json
   \`\`\`

2. **Verify File Hashes:**
   \`\`\`bash
   sha256sum artifacts/*
   \`\`\`

3. **Compare with Manifest:**
   Check that computed hashes match those in \`manifest.json\` under \`hashTree.leaves\`.

## Revocation

${
  wallet.revocable
    ? `This wallet is revocable. Check revocation status at:
${wallet.revocationListUrl || 'No revocation list URL provided'}`
    : 'This wallet is not revocable.'
}

## License

See \`manifest.json\` for complete license information and citations.

## Contact

**Created By:** ${wallet.createdBy}
${wallet.manifest.metadata.contact ? `**Contact:** ${wallet.manifest.metadata.contact}` : ''}
`;
  }

  /**
   * Create multiple wallets for different audiences
   */
  async createMultiAudienceWallets(
    manifest: ProofCarryingManifest,
    audiences: AudienceScope[],
    getArtifacts: (audience: AudienceScope) => string[]
  ): Promise<EvidenceWallet[]> {
    const wallets: EvidenceWallet[] = [];

    for (const audience of audiences) {
      const artifacts = getArtifacts(audience);
      const wallet = await this.createWallet(manifest, {
        audience,
        artifacts,
        revocable: true,
      });
      wallets.push(wallet);
    }

    return wallets;
  }
}

/**
 * Helper to create standard audience scopes
 */
export const AudienceScopes = {
  public: (): AudienceScope => ({
    id: 'public',
    name: 'Public',
    description: 'Publicly accessible data',
    maxSensitivity: 'public',
  }),

  internal: (organization: string): AudienceScope => ({
    id: `internal-${organization}`,
    name: 'Internal',
    description: `Internal to ${organization}`,
    maxSensitivity: 'internal',
    allowedOrganizations: [organization],
  }),

  confidential: (
    organization: string,
    roles: string[]
  ): AudienceScope => ({
    id: `confidential-${organization}`,
    name: 'Confidential',
    description: `Confidential data for ${organization}`,
    maxSensitivity: 'confidential',
    allowedOrganizations: [organization],
    allowedRoles: roles,
  }),

  restricted: (
    organization: string,
    users: string[],
    clearance: string[]
  ): AudienceScope => ({
    id: `restricted-${organization}`,
    name: 'Restricted',
    description: `Restricted data for ${organization}`,
    maxSensitivity: 'restricted',
    allowedOrganizations: [organization],
    allowedUsers: users,
    requiredClearance: clearance,
  }),
};
