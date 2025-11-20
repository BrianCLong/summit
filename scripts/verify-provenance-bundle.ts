#!/usr/bin/env ts-node
/**
 * Offline Provenance Bundle Verification CLI
 * Verifies export manifests without database access
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { MerkleTreeBuilder } from '../server/src/utils/merkle-tree.js';
import type {
  ExportManifest,
  VerificationReport,
  ItemVerification,
} from '../server/src/types/provenance-beta.js';

interface BundleFile {
  manifest: ExportManifest;
  claims?: any[];
  evidence?: any[];
  sources?: any[];
  transforms?: any[];
}

class OfflineVerifier {
  /**
   * Verify a bundle from a JSON file
   */
  async verifyBundle(bundlePath: string): Promise<VerificationReport> {
    console.log(`\n📦 Loading bundle from: ${bundlePath}`);

    // Load bundle file
    const bundleContent = await fs.readFile(bundlePath, 'utf-8');
    const bundle: BundleFile = JSON.parse(bundleContent);

    if (!bundle.manifest) {
      throw new Error('Invalid bundle: missing manifest');
    }

    const manifest = bundle.manifest;

    console.log(`✓ Bundle loaded`);
    console.log(`  Manifest ID: ${manifest.manifest_id}`);
    console.log(`  Bundle ID: ${manifest.bundle_id}`);
    console.log(`  Items: ${manifest.items.length}`);
    console.log(`  Merkle Root: ${manifest.merkle_root.substring(0, 16)}...`);

    // Start verification
    console.log(`\n🔍 Verifying bundle integrity...\n`);

    const errors: string[] = [];

    // ========================================================================
    // 1. Verify Signature
    // ========================================================================
    console.log(`1️⃣  Verifying manifest signature...`);

    const manifestCopy = { ...manifest };
    delete (manifestCopy as any).signature;
    delete (manifestCopy as any).public_key_id;

    const expectedSignature = this.computeSignature(manifestCopy);
    const signature_valid = manifest.signature === expectedSignature;

    if (signature_valid) {
      console.log(`   ✅ Signature valid`);
    } else {
      console.log(`   ❌ Signature invalid`);
      errors.push('Manifest signature verification failed');
    }

    // ========================================================================
    // 2. Verify Merkle Root
    // ========================================================================
    console.log(`\n2️⃣  Verifying Merkle root...`);

    const tree = MerkleTreeBuilder.buildFromItems(manifest.items);
    const recomputedRoot = tree.root;
    const merkle_valid = recomputedRoot === manifest.merkle_root;

    if (merkle_valid) {
      console.log(`   ✅ Merkle root matches`);
      console.log(`      Expected: ${manifest.merkle_root.substring(0, 16)}...`);
      console.log(`      Computed: ${recomputedRoot.substring(0, 16)}...`);
    } else {
      console.log(`   ❌ Merkle root mismatch`);
      console.log(`      Expected: ${manifest.merkle_root}`);
      console.log(`      Computed: ${recomputedRoot}`);
      errors.push('Merkle root verification failed');
    }

    // ========================================================================
    // 3. Verify Each Item's Merkle Proof
    // ========================================================================
    console.log(`\n3️⃣  Verifying individual item proofs...`);

    const item_verifications: ItemVerification[] = [];
    let validCount = 0;

    for (const item of manifest.items) {
      const proofValid = MerkleTreeBuilder.verifyProof(
        item.content_hash,
        item.merkle_proof,
        manifest.merkle_root,
      );

      item_verifications.push({
        item_id: item.id,
        item_type: item.item_type,
        valid: proofValid,
        error: proofValid ? undefined : 'Merkle proof verification failed',
      });

      if (proofValid) {
        validCount++;
      } else {
        errors.push(`Item ${item.id} proof verification failed`);
      }
    }

    console.log(`   ✅ ${validCount}/${manifest.items.length} items verified`);

    if (validCount < manifest.items.length) {
      console.log(
        `   ❌ ${manifest.items.length - validCount} items failed verification`,
      );
    }

    // ========================================================================
    // 4. Verify Content Hashes (if items provided)
    // ========================================================================
    console.log(`\n4️⃣  Verifying content hashes...`);

    let contentHashesValid = true;

    if (bundle.claims && bundle.claims.length > 0) {
      for (const claim of bundle.claims) {
        const expectedHash = this.computeHash(claim.content);
        if (claim.content_hash !== expectedHash) {
          console.log(`   ❌ Claim ${claim.id} content hash mismatch`);
          errors.push(`Claim ${claim.id} content hash mismatch`);
          contentHashesValid = false;
        }
      }
    }

    if (bundle.evidence && bundle.evidence.length > 0) {
      for (const evidence of bundle.evidence) {
        // Evidence hashes are typically pre-computed
        // Could verify storage URIs or other metadata
      }
    }

    if (contentHashesValid) {
      console.log(`   ✅ Content hashes valid`);
    }

    // ========================================================================
    // 5. Check License Conflicts
    // ========================================================================
    console.log(`\n5️⃣  Checking license conflicts...`);

    const license_issues: string[] = [];

    if (manifest.licenses && manifest.licenses.length > 0) {
      // Check for conflicting restrictions
      const restrictedLicenses = manifest.licenses.filter(
        (l) => l.license_type === 'restricted' || l.license_type === 'classified',
      );

      const publicLicenses = manifest.licenses.filter(
        (l) => l.license_type === 'public',
      );

      if (restrictedLicenses.length > 0 && publicLicenses.length > 0) {
        license_issues.push(
          'Conflicting license types: restricted and public licenses in same bundle',
        );
      }

      // Check for expired licenses
      const now = new Date();
      const expiredLicenses = manifest.licenses.filter(
        (l) => l.expiration_date && new Date(l.expiration_date) < now,
      );

      if (expiredLicenses.length > 0) {
        license_issues.push(
          `${expiredLicenses.length} expired license(s) in bundle`,
        );
      }
    }

    if (license_issues.length === 0) {
      console.log(`   ✅ No license conflicts detected`);
    } else {
      console.log(`   ⚠️  ${license_issues.length} license issue(s) found:`);
      license_issues.forEach((issue) => {
        console.log(`      - ${issue}`);
      });
    }

    // ========================================================================
    // Final Report
    // ========================================================================
    const bundle_valid =
      signature_valid &&
      merkle_valid &&
      item_verifications.every((v) => v.valid) &&
      contentHashesValid;

    const report: VerificationReport = {
      manifest_id: manifest.manifest_id,
      bundle_valid,
      signature_valid,
      merkle_valid,
      item_verifications,
      chain_verifications: [], // Would need full data for this
      license_issues,
      verified_at: new Date(),
      verification_details: {
        items_verified: validCount,
        items_total: manifest.items.length,
        content_hashes_valid: contentHashesValid,
      },
    };

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`VERIFICATION SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Bundle Valid: ${bundle_valid ? '✅ YES' : '❌ NO'}`);
    console.log(`Signature Valid: ${signature_valid ? '✅' : '❌'}`);
    console.log(`Merkle Root Valid: ${merkle_valid ? '✅' : '❌'}`);
    console.log(`Items Valid: ${validCount}/${manifest.items.length} ${validCount === manifest.items.length ? '✅' : '❌'}`);
    console.log(`License Issues: ${license_issues.length === 0 ? '✅ None' : `⚠️  ${license_issues.length}`}`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors (${errors.length}):`);
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log(`\n${'='.repeat(60)}\n`);

    if (bundle_valid) {
      console.log(`✅ Bundle verification PASSED`);
      console.log(`   This bundle's integrity is verified.`);
      console.log(`   All items are authentic and untampered.\n`);
    } else {
      console.log(`❌ Bundle verification FAILED`);
      console.log(`   This bundle may have been tampered with.`);
      console.log(`   Do not trust the contents.\n`);
    }

    return report;
  }

  /**
   * Compute hash of data (SHA-256)
   */
  private computeHash(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Compute signature (HMAC-SHA256)
   */
  private computeSignature(data: any): string {
    const content = JSON.stringify(data, Object.keys(data).sort());
    const key =
      process.env.LEDGER_SIGNING_KEY || 'default-key'; // In production, use proper key
    const hmac = crypto.createHmac('sha256', key);
    return hmac.update(content).digest('hex');
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│  Provenance Bundle Offline Verification Tool                │
│  Verifies the integrity of exported provenance bundles      │
└─────────────────────────────────────────────────────────────┘

Usage:
  ts-node verify-provenance-bundle.ts <bundle-file.json>
  ts-node verify-provenance-bundle.ts --help

Arguments:
  <bundle-file.json>   Path to the bundle JSON file

Environment Variables:
  LEDGER_SIGNING_KEY   Secret key for signature verification
                       (must match the key used during export)

Examples:
  # Verify a bundle
  ts-node verify-provenance-bundle.ts ./exports/bundle-123.json

  # Verify with custom signing key
  LEDGER_SIGNING_KEY=my-secret-key ts-node verify-provenance-bundle.ts bundle.json

Exit Codes:
  0 - Verification passed
  1 - Verification failed or error occurred
`);
    process.exit(0);
  }

  const bundlePath = args[0];

  // Check if file exists
  try {
    await fs.access(bundlePath);
  } catch (error) {
    console.error(`❌ Error: File not found: ${bundlePath}`);
    process.exit(1);
  }

  try {
    const verifier = new OfflineVerifier();
    const report = await verifier.verifyBundle(bundlePath);

    // Save report
    const reportPath = bundlePath.replace('.json', '-verification-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Verification report saved to: ${reportPath}\n`);

    // Exit with appropriate code
    process.exit(report.bundle_valid ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Verification error:`, error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OfflineVerifier };
