#!/usr/bin/env node

/**
 * Maestro Provenance Verifier CLI
 * Verifies exported Merkle manifests independently
 */

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

function merkleRoot(hashes) {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  let layer = hashes.map((h) => Buffer.from(h, 'hex'));

  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1] ?? layer[i];
      next.push(
        createHash('sha256')
          .update(Buffer.concat([a, b]))
          .digest(),
      );
    }
    layer = next;
  }

  return layer[0].toString('hex');
}

async function verifyManifest(manifestPath) {
  try {
    console.log('🔍 Verifying Maestro provenance manifest...');
    console.log(`📁 File: ${manifestPath}\n`);

    // Read manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Validate structure
    const required = [
      'runId',
      'rootHash',
      'evidenceCount',
      'manifest',
      'timestamp',
    ];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    console.log(`📊 Run ID: ${manifest.runId}`);
    console.log(`🕐 Exported: ${manifest.timestamp}`);
    console.log(`📦 Evidence Count: ${manifest.evidenceCount}`);
    console.log(`🔗 Claimed Root Hash: ${manifest.rootHash}\n`);

    // Verify evidence count
    if (manifest.manifest.length !== manifest.evidenceCount) {
      throw new Error(
        `Evidence count mismatch: claimed ${manifest.evidenceCount}, found ${manifest.manifest.length}`,
      );
    }

    // Verify individual evidence hashes
    console.log('🔐 Verifying individual evidence items...');
    for (let i = 0; i < manifest.manifest.length; i++) {
      const evidence = manifest.manifest[i];
      if (!evidence.hash) {
        throw new Error(`Evidence item ${i} missing hash`);
      }
      if (!evidence.id) {
        throw new Error(`Evidence item ${i} missing ID`);
      }
      console.log(`  ✅ ${evidence.id} (${evidence.artifactType})`);
    }

    // Compute Merkle root
    console.log('\n🌳 Computing Merkle tree root...');
    const hashes = manifest.manifest.map((e) => e.hash);
    const computedRoot = merkleRoot(hashes);

    console.log(`🔗 Computed Root Hash: ${computedRoot}`);

    // Verify root hash
    const valid = computedRoot === manifest.rootHash;

    if (valid) {
      console.log('\n✅ VERIFICATION SUCCESSFUL');
      console.log('🎉 Manifest integrity confirmed!');
      console.log('📋 All evidence items are properly linked in Merkle tree');
    } else {
      console.log('\n❌ VERIFICATION FAILED');
      console.log(
        '⚠️  Root hash mismatch - manifest may be corrupted or tampered',
      );
      console.log(`   Expected: ${manifest.rootHash}`);
      console.log(`   Computed: ${computedRoot}`);
    }

    // Additional checks
    console.log('\n📋 Additional Checks:');

    // Check timestamp validity
    const exportTime = new Date(manifest.timestamp);
    const now = new Date();
    if (exportTime > now) {
      console.log('⚠️  Warning: Export timestamp is in the future');
    }

    // Check for duplicate evidence IDs
    const ids = new Set();
    let duplicates = 0;
    for (const evidence of manifest.manifest) {
      if (ids.has(evidence.id)) {
        duplicates++;
      } else {
        ids.add(evidence.id);
      }
    }
    if (duplicates > 0) {
      console.log(`⚠️  Warning: Found ${duplicates} duplicate evidence IDs`);
    } else {
      console.log('✅ No duplicate evidence IDs found');
    }

    // Check artifact types distribution
    const typeCount = {};
    for (const evidence of manifest.manifest) {
      typeCount[evidence.artifactType] =
        (typeCount[evidence.artifactType] || 0) + 1;
    }
    console.log('📊 Evidence distribution:');
    for (const [type, count] of Object.entries(typeCount)) {
      console.log(`   ${type}: ${count}`);
    }

    return valid;
  } catch (error) {
    console.error('\n❌ VERIFICATION ERROR');
    console.error(`🚨 ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node verifier-cli.js <manifest.json>');
    console.log('');
    console.log('Verifies the integrity of a Maestro provenance manifest');
    console.log('by recomputing the Merkle tree root and comparing with');
    console.log('the claimed root hash.');
    process.exit(1);
  }

  const manifestPath = path.resolve(args[0]);

  try {
    await fs.access(manifestPath);
  } catch {
    console.error(`❌ File not found: ${manifestPath}`);
    process.exit(1);
  }

  const valid = await verifyManifest(manifestPath);
  process.exit(valid ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
