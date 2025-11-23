#!/usr/bin/env node
/**
 * Provenance Manifest Verification CLI
 *
 * This tool verifies the integrity of exported provenance manifests offline.
 * It recomputes hashes and verifies the Merkle tree to detect tampering.
 *
 * Usage:
 *   provenance-verify <manifest.json> [--evidence-dir <path>]
 *
 * Examples:
 *   provenance-verify export-manifest.json
 *   provenance-verify export-manifest.json --evidence-dir ./evidence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExportManifest, ManifestItem } from '../types/provenance-beta.js';

interface VerificationResult {
  valid: boolean;
  manifestValid: boolean;
  merkleRootValid: boolean;
  allItemsValid: boolean;
  evidenceFilesChecked: number;
  evidenceFilesMismatched: number;
  errors: string[];
  warnings: string[];
}

class ProvenanceVerifier {
  private manifestPath: string;
  private evidenceDir?: string;

  constructor(manifestPath: string, evidenceDir?: string) {
    this.manifestPath = manifestPath;
    this.evidenceDir = evidenceDir;
  }

  /**
   * Compute deterministic hash of data
   */
  private computeHash(data: any): string {
    const normalized =
      typeof data === 'string'
        ? data
        : JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Verify a Merkle proof
   */
  private verifyMerkleProof(
    leafHash: string,
    proof: string[],
    rootHash: string,
  ): boolean {
    let computedHash = leafHash;

    for (const proofElement of proof) {
      if (computedHash < proofElement) {
        computedHash = crypto
          .createHash('sha256')
          .update(computedHash + proofElement)
          .digest('hex');
      } else {
        computedHash = crypto
          .createHash('sha256')
          .update(proofElement + computedHash)
          .digest('hex');
      }
    }

    return computedHash === rootHash;
  }

  /**
   * Build Merkle root from items
   */
  private buildMerkleRoot(items: ManifestItem[]): string {
    if (items.length === 0) {
      return '';
    }

    let hashes = items.map((item) => item.content_hash);

    while (hashes.length > 1) {
      const newHashes: string[] = [];

      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const combined = hashes[i] + hashes[i + 1];
          newHashes.push(crypto.createHash('sha256').update(combined).digest('hex'));
        } else {
          newHashes.push(hashes[i]);
        }
      }

      hashes = newHashes;
    }

    return hashes[0];
  }

  /**
   * Verify evidence files if directory provided
   */
  private async verifyEvidenceFiles(
    manifest: ExportManifest,
  ): Promise<{
    checked: number;
    mismatched: number;
    errors: string[];
  }> {
    if (!this.evidenceDir) {
      return { checked: 0, mismatched: 0, errors: [] };
    }

    let checked = 0;
    let mismatched = 0;
    const errors: string[] = [];

    const evidenceItems = manifest.items.filter(
      (item) => item.item_type === 'evidence',
    );

    for (const item of evidenceItems) {
      const filePath = path.join(this.evidenceDir, item.id);

      if (!fs.existsSync(filePath)) {
        errors.push(`Evidence file not found: ${filePath}`);
        continue;
      }

      try {
        const fileContent = fs.readFileSync(filePath);
        const fileHash = crypto
          .createHash('sha256')
          .update(fileContent)
          .digest('hex');

        checked++;

        if (fileHash !== item.content_hash) {
          mismatched++;
          errors.push(
            `Evidence file hash mismatch for ${item.id}: expected ${item.content_hash}, got ${fileHash}`,
          );
        }
      } catch (error) {
        errors.push(
          `Failed to read evidence file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { checked, mismatched, errors };
  }

  /**
   * Main verification method
   */
  async verify(): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: true,
      manifestValid: true,
      merkleRootValid: true,
      allItemsValid: true,
      evidenceFilesChecked: 0,
      evidenceFilesMismatched: 0,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Load and parse manifest
      if (!fs.existsSync(this.manifestPath)) {
        result.valid = false;
        result.manifestValid = false;
        result.errors.push(`Manifest file not found: ${this.manifestPath}`);
        return result;
      }

      const manifestContent = fs.readFileSync(this.manifestPath, 'utf-8');
      let manifest: ExportManifest;

      try {
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        result.valid = false;
        result.manifestValid = false;
        result.errors.push(`Failed to parse manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
        return result;
      }

      // 2. Validate manifest structure
      if (!manifest.manifest_id || !manifest.merkle_root || !manifest.items) {
        result.valid = false;
        result.manifestValid = false;
        result.errors.push('Manifest missing required fields');
        return result;
      }

      console.log(`✓ Manifest loaded: ${manifest.manifest_id}`);
      console.log(`  Items: ${manifest.items.length}`);
      console.log(`  Created: ${manifest.created_at}`);
      console.log(`  Merkle Root: ${manifest.merkle_root.substring(0, 16)}...`);
      console.log();

      // 3. Verify Merkle root
      const recomputedRoot = this.buildMerkleRoot(manifest.items);

      if (recomputedRoot !== manifest.merkle_root) {
        result.valid = false;
        result.merkleRootValid = false;
        result.errors.push(
          `Merkle root mismatch: expected ${manifest.merkle_root}, got ${recomputedRoot}`,
        );
        console.log(`✗ Merkle root verification FAILED`);
      } else {
        console.log(`✓ Merkle root verified`);
      }

      // 4. Verify each item's Merkle proof
      let itemsValid = 0;
      let itemsInvalid = 0;

      for (const item of manifest.items) {
        const proofValid = this.verifyMerkleProof(
          item.content_hash,
          item.merkle_proof,
          manifest.merkle_root,
        );

        if (!proofValid) {
          itemsInvalid++;
          result.allItemsValid = false;
          result.valid = false;
          result.errors.push(
            `Merkle proof invalid for item ${item.id} (${item.item_type})`,
          );
        } else {
          itemsValid++;
        }
      }

      console.log(`✓ Verified ${itemsValid}/${manifest.items.length} item proofs`);
      if (itemsInvalid > 0) {
        console.log(`✗ ${itemsInvalid} item proofs FAILED`);
      }
      console.log();

      // 5. Verify evidence files if directory provided
      if (this.evidenceDir) {
        console.log(`Checking evidence files in: ${this.evidenceDir}`);
        const evidenceResult = await this.verifyEvidenceFiles(manifest);

        result.evidenceFilesChecked = evidenceResult.checked;
        result.evidenceFilesMismatched = evidenceResult.mismatched;
        result.errors.push(...evidenceResult.errors);

        if (evidenceResult.mismatched > 0) {
          result.valid = false;
        }

        console.log(`✓ Checked ${evidenceResult.checked} evidence files`);
        if (evidenceResult.mismatched > 0) {
          console.log(`✗ ${evidenceResult.mismatched} files had hash mismatches`);
        }
        console.log();
      }

      // 6. Check for license conflicts (warning only)
      if (manifest.license_conflicts && manifest.license_conflicts.length > 0) {
        result.warnings.push(
          `License conflicts detected: ${manifest.license_conflicts.join(', ')}`,
        );
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Verification failed with exception: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Provenance Manifest Verification Tool

Usage:
  provenance-verify <manifest.json> [--evidence-dir <path>]

Options:
  --evidence-dir <path>   Directory containing evidence files to verify against hashes
  --help, -h              Show this help message

Examples:
  provenance-verify export-manifest.json
  provenance-verify export-manifest.json --evidence-dir ./evidence

Description:
  This tool verifies the integrity of exported provenance manifests.
  It checks:
  - Manifest structure and validity
  - Merkle root recomputation
  - Individual item Merkle proofs
  - Evidence file hashes (if evidence directory provided)

Exit Codes:
  0 - Verification passed
  1 - Verification failed or error occurred
    `);
    process.exit(0);
  }

  const manifestPath = args[0];
  let evidenceDir: string | undefined;

  const evidenceDirIndex = args.indexOf('--evidence-dir');
  if (evidenceDirIndex !== -1 && evidenceDirIndex + 1 < args.length) {
    evidenceDir = args[evidenceDirIndex + 1];
  }

  console.log('Provenance Manifest Verification Tool');
  console.log('=====================================');
  console.log();

  const verifier = new ProvenanceVerifier(manifestPath, evidenceDir);
  const result = await verifier.verify();

  // Print summary
  console.log('Verification Summary');
  console.log('===================');
  console.log(`Overall Result: ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Manifest Valid: ${result.manifestValid ? '✓' : '✗'}`);
  console.log(`Merkle Root Valid: ${result.merkleRootValid ? '✓' : '✗'}`);
  console.log(`All Items Valid: ${result.allItemsValid ? '✓' : '✗'}`);

  if (result.evidenceFilesChecked > 0) {
    console.log(
      `Evidence Files: ${result.evidenceFilesChecked - result.evidenceFilesMismatched}/${result.evidenceFilesChecked} valid`,
    );
  }

  console.log();

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach((error) => {
      console.log(`  ✗ ${error}`);
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach((warning) => {
      console.log(`  ⚠ ${warning}`);
    });
    console.log();
  }

  process.exit(result.valid ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ProvenanceVerifier, VerificationResult };
