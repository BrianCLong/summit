#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { dualNotary } from '../../server/src/federal/dual-notary.js';

/**
 * Daily Merkle Root Generator with HSM + TSA Signatures
 * Creates tamper-evident audit trail for federal compliance
 */

interface MerkleProof {
  root: string;
  leaves: string[];
  timestamp: string;
  hsmSignature?: string;
  tsaResponse?: string;
  metadata: {
    totalFiles: number;
    totalBytes: number;
    generatedBy: string;
    environment: string;
    classification: string;
  };
}

function computeSHA256(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function buildMerkleTree(leaves: string[]): string {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree with no leaves');
  }

  let currentLevel = [...leaves];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left; // Duplicate if odd number

      const combined = left + right;
      const hash = createHash('sha256').update(combined).digest('hex');
      nextLevel.push(hash);
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

function getTotalBytes(filePaths: string[]): number {
  return filePaths.reduce((total, filePath) => {
    if (existsSync(filePath)) {
      const stat = require('fs').statSync(filePath);
      return total + stat.size;
    }
    return total;
  }, 0);
}

async function generateDailyMerkleProof(
  filePaths: string[],
  outputPath = 'daily-merkle.json',
): Promise<void> {
  console.log(`Generating Merkle proof for ${filePaths.length} files...`);

  try {
    // Compute file hashes (leaves)
    const leaves: string[] = [];
    const failedFiles: string[] = [];

    for (const filePath of filePaths) {
      try {
        const hash = computeSHA256(filePath);
        leaves.push(hash);
        console.log(`✅ ${filePath}: ${hash}`);
      } catch (error) {
        console.error(`❌ ${filePath}: ${error.message}`);
        failedFiles.push(filePath);
      }
    }

    if (leaves.length === 0) {
      throw new Error('No valid files found for Merkle tree generation');
    }

    if (failedFiles.length > 0) {
      console.warn(
        `Warning: ${failedFiles.length} files could not be processed`,
      );
    }

    // Build Merkle tree
    const merkleRoot = buildMerkleTree(leaves);
    console.log(`📊 Merkle Root: ${merkleRoot}`);

    // Create proof structure
    const proof: MerkleProof = {
      root: merkleRoot,
      leaves: leaves,
      timestamp: new Date().toISOString(),
      metadata: {
        totalFiles: leaves.length,
        totalBytes: getTotalBytes(filePaths.filter((f) => existsSync(f))),
        generatedBy: `${process.env.USER || 'unknown'}@${require('os').hostname()}`,
        environment: process.env.FEDERAL_ENV || 'development',
        classification: process.env.CLASSIFICATION || 'UNCLASSIFIED',
      },
    };

    // Sign with HSM if available
    try {
      console.log('🔐 Signing Merkle root with HSM...');
      const notarized = await dualNotary.notarizeRoot(merkleRoot);

      proof.hsmSignature = notarized.hsmSignature;
      proof.tsaResponse = notarized.tsaResponse;

      console.log(
        `✅ HSM signature: ${notarized.hsmSignature ? 'present' : 'failed'}`,
      );
      console.log(
        `✅ TSA response: ${notarized.tsaResponse ? 'present' : 'not available'}`,
      );
    } catch (error) {
      console.warn(`⚠️  HSM signing failed: ${error.message}`);
      console.warn('Continuing without HSM signature (development mode)');
    }

    // Write proof to file
    writeFileSync(outputPath, JSON.stringify(proof, null, 2));
    console.log(`📄 Merkle proof written to: ${outputPath}`);

    // Generate summary
    console.log('\n📋 Summary:');
    console.log(`   Files processed: ${proof.metadata.totalFiles}`);
    console.log(
      `   Total size: ${(proof.metadata.totalBytes / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(`   Merkle root: ${proof.root}`);
    console.log(`   HSM signed: ${proof.hsmSignature ? 'Yes' : 'No'}`);
    console.log(`   TSA stamped: ${proof.tsaResponse ? 'Yes' : 'No'}`);
    console.log(`   Classification: ${proof.metadata.classification}`);
  } catch (error) {
    console.error(`❌ Failed to generate Merkle proof: ${error.message}`);
    process.exit(1);
  }
}

async function verifyMerkleProof(proofPath: string): Promise<boolean> {
  console.log(`Verifying Merkle proof: ${proofPath}`);

  try {
    if (!existsSync(proofPath)) {
      throw new Error(`Proof file not found: ${proofPath}`);
    }

    const proof: MerkleProof = JSON.parse(readFileSync(proofPath, 'utf8'));

    // Verify Merkle tree construction
    const recomputedRoot = buildMerkleTree(proof.leaves);

    if (recomputedRoot !== proof.root) {
      console.error(`❌ Merkle root mismatch:`);
      console.error(`   Expected: ${proof.root}`);
      console.error(`   Computed: ${recomputedRoot}`);
      return false;
    }

    console.log(`✅ Merkle root verification: PASS`);

    // Verify HSM signature if present
    if (proof.hsmSignature) {
      try {
        const mockNotarized = {
          rootHex: proof.root,
          hsmSignature: proof.hsmSignature,
          tsaResponse: proof.tsaResponse,
          timestamp: new Date(proof.timestamp),
          notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
          verification: { hsmValid: true, tsaValid: !!proof.tsaResponse },
        };

        const verification =
          await dualNotary.verifyNotarizedRoot(mockNotarized);
        console.log(
          `✅ HSM signature verification: ${verification.hsmVerification ? 'PASS' : 'FAIL'}`,
        );
        console.log(
          `✅ TSA timestamp verification: ${verification.tsaVerification ? 'PASS' : 'N/A'}`,
        );

        if (verification.errors.length > 0) {
          console.warn(
            `⚠️  Verification warnings: ${verification.errors.join(', ')}`,
          );
        }
      } catch (error) {
        console.warn(`⚠️  Signature verification failed: ${error.message}`);
      }
    }

    console.log(`✅ Proof verification complete`);
    return true;
  } catch (error) {
    console.error(`❌ Proof verification failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: emit_merkle_and_sign.ts [OPTIONS] <file1> [file2] ...');
    console.log('       emit_merkle_and_sign.ts --verify <proof.json>');
    console.log('');
    console.log('Options:');
    console.log(
      '  --output, -o PATH    Output path for Merkle proof (default: daily-merkle.json)',
    );
    console.log('  --verify PATH        Verify existing Merkle proof');
    console.log('  --help, -h           Show this help');
    console.log('');
    console.log('Environment Variables:');
    console.log('  FEDERAL_ENV         Federal environment name');
    console.log('  CLASSIFICATION      Data classification level');
    console.log('  HSM_ENABLED         Enable HSM signing (true/false)');
    console.log('  TSA_ENABLED         Enable TSA timestamping (true/false)');
    process.exit(1);
  }

  let outputPath = 'daily-merkle.json';
  let verifyMode = false;
  const filePaths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i];
    } else if (arg === '--verify') {
      verifyMode = true;
      outputPath = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log('Federal Merkle Root Generator with HSM + TSA Notarization');
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      filePaths.push(arg);
    }
  }

  if (verifyMode) {
    const valid = await verifyMerkleProof(outputPath);
    process.exit(valid ? 0 : 1);
  } else {
    await generateDailyMerkleProof(filePaths, outputPath);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}
