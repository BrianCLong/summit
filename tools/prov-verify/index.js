#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

function canonicalJSON(obj) {
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

function calculateHash(data) {
  return crypto.createHash('sha256').update(canonicalJSON(data)).digest('hex');
}

function verifyBundle(bundlePath) {
  const content = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(content);

  console.log(`Verifying bundle: ${bundle.bundleId}`);

  const entries = bundle.entries;
  if (!entries || entries.length === 0) {
    console.error('No entries found');
    process.exit(1);
  }

  let previousHash = null;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Verify previousHash link
    if (entry.previousHash !== previousHash) {
      console.error(`Broken chain at entry ${entry.id}. Expected prev ${previousHash}, got ${entry.previousHash}`);
      process.exit(1);
    }

    // Recompute hash
    const payload = {
      type: entry.type,
      data: entry.data,
      previousHash: entry.previousHash,
      caseId: entry.caseId
    };

    const computedHash = calculateHash(payload);

    if (computedHash !== entry.hash) {
      console.error(`Hash mismatch at entry ${entry.id}. Computed ${computedHash}, got ${entry.hash}`);
      process.exit(1);
    }

    previousHash = entry.hash;
  }

  // Verify root
  if (previousHash !== bundle.merkleRoot) {
     console.error(`Merkle root mismatch. Computed ${previousHash}, got ${bundle.merkleRoot}`);
     process.exit(1);
  }

  console.log('Verification Successful! ✅');
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: node index.js <bundle.json>');
  process.exit(1);
}

verifyBundle(args[0]);
