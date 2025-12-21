#!/usr/bin/env node

import { createHash, verify } from 'crypto';
import fs from 'fs';

interface Manifest {
  bundleId: string;
  merkleRoot: string;
  entries: LedgerEntry[];
}

interface LedgerEntry {
  id: string;
  type: string;
  data: any;
  previousHash: string | null;
  hash: string;
  signature: string;
  publicKey: string;
}

// Canonical JSON stringify (must match server implementation)
function canonicalJSON(obj: any): string {
  if (obj === undefined) { return 'undefined'; }
  if (obj === null) { return 'null'; }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalJSON(item)).join(',') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(key => {
      const val = obj[key];
      return JSON.stringify(key) + ':' + canonicalJSON(val);
    }).join(',') + '}';
  }

  return JSON.stringify(obj);
}

function calculateHash(entry: { type: string, data: any, previousHash: string | null }): string {
  return createHash('sha256').update(canonicalJSON(entry)).digest('hex');
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let level = [...hashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      const combined = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
      next.push(createHash('sha256').update(combined).digest('hex'));
    }
    level = next;
  }
  return level[0];
}

async function verifyManifest(manifestPath: string) {
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: Manifest = JSON.parse(content);

    console.log(`Verifying Manifest Bundle: ${manifest.bundleId}`);
    console.log(`Merkle Root: ${manifest.merkleRoot}`);
    console.log(`Entries: ${manifest.entries.length}`);

    let previousHash: string | null = null;
    let allValid = true;

    for (const entry of manifest.entries) {
      if (entry.previousHash !== previousHash) {
        console.error(`[FAIL] Chain broken at ${entry.id}. Expected prev: ${previousHash}, Got: ${entry.previousHash}`);
        allValid = false;
        break;
      }

      const payloadToHash = {
        type: entry.type,
        data: entry.data,
        previousHash: entry.previousHash
      };

      const calculated = calculateHash(payloadToHash);
      if (calculated !== entry.hash) {
         console.error(`[FAIL] Hash mismatch at ${entry.id}. Calculated: ${calculated}, Stored: ${entry.hash}`);
         // Debugging help
         console.error(`Payload hashed: ${canonicalJSON(payloadToHash)}`);
         allValid = false;
         break;
      }

      const isValidSignature = verify(null, Buffer.from(entry.hash, 'hex'), entry.publicKey, Buffer.from(entry.signature, 'base64'));
      if (!isValidSignature) {
        console.error(`[FAIL] Invalid signature for ${entry.id}`);
        allValid = false;
        break;
      }

      previousHash = entry.hash;
    }

    if (manifest.entries.length > 0) {
        const recomputedRoot = computeMerkleRoot(manifest.entries.map(entry => entry.hash));
        if (recomputedRoot !== manifest.merkleRoot) {
             console.error(`[FAIL] Merkle Root mismatch. Recomputed: ${recomputedRoot}, Root: ${manifest.merkleRoot}`);
             allValid = false;
        }
    }

    if (allValid) {
      console.log('✅ Manifest Verified Successfully. Tamper-evident chain is intact.');
    } else {
      console.log('❌ Verification Failed.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Error reading or parsing manifest:', err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: pcl-verify <path-to-manifest.json>');
  process.exit(1);
}

verifyManifest(args[0]);
