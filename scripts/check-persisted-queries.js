#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking persisted query allowlist for drift...\n');

// Load current allowlist
const allowlistPath = path.join(
  __dirname,
  '../.maestro/persisted-queries.json',
);
let currentAllowlist = {};

try {
  currentAllowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
} catch (error) {
  console.error(
    '❌ Failed to load persisted queries allowlist:',
    error.message,
  );
  process.exit(1);
}

console.log(
  `📋 Current allowlist contains ${Object.keys(currentAllowlist).length} queries`,
);

// Define expected queries for v24 Coherence domain
const expectedQueries = {
  tenantCoherence:
    'query($tenantId:ID!){ tenantCoherence(tenantId:$tenantId){ score status updatedAt } }',
  publishCoherenceSignal:
    'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
};

// Compute expected hashes
const expectedHashes = {};
for (const [name, query] of Object.entries(expectedQueries)) {
  const hash = crypto.createHash('sha256').update(query).digest('hex');
  expectedHashes[hash] = { name, query };
}

console.log(
  `📋 Expected queries for v24 Coherence: ${Object.keys(expectedQueries).length}\n`,
);

let driftDetected = false;

// Check if all expected queries are present
console.log('🔍 Checking for missing queries:');
for (const [hash, { name, query }] of Object.entries(expectedHashes)) {
  if (!(hash in currentAllowlist)) {
    console.log(`❌ Missing query: ${name}`);
    console.log(`   Hash: ${hash}`);
    console.log(`   Query: ${query}`);
    driftDetected = true;
  } else if (currentAllowlist[hash] !== query) {
    console.log(`⚠️  Query mismatch for: ${name}`);
    console.log(`   Expected: ${query}`);
    console.log(`   Current:  ${currentAllowlist[hash]}`);
    driftDetected = true;
  } else {
    console.log(`✅ ${name}: Hash matches`);
  }
}

// Check for unexpected queries
console.log('\n🔍 Checking for unexpected queries:');
let unexpectedCount = 0;
for (const [hash, query] of Object.entries(currentAllowlist)) {
  if (!(hash in expectedHashes)) {
    console.log(`⚠️  Unexpected query found:`);
    console.log(`   Hash: ${hash}`);
    console.log(`   Query: ${query}`);
    unexpectedCount++;
  }
}

if (unexpectedCount === 0) {
  console.log('✅ No unexpected queries found');
}

// Summary
console.log(`\n📊 Summary:`);
console.log(`- Expected queries: ${Object.keys(expectedQueries).length}`);
console.log(`- Current allowlist: ${Object.keys(currentAllowlist).length}`);
console.log(`- Unexpected queries: ${unexpectedCount}`);

if (driftDetected) {
  console.log('\n❌ Persisted query drift detected!');
  console.log('Please update the allowlist or fix the queries.');

  // Optionally generate correct allowlist
  if (process.env.FIX_DRIFT === 'true') {
    console.log('\n🔧 Auto-fixing allowlist...');
    const correctedAllowlist = {};
    for (const [hash, { query }] of Object.entries(expectedHashes)) {
      correctedAllowlist[hash] = query;
    }

    fs.writeFileSync(
      allowlistPath,
      JSON.stringify(correctedAllowlist, null, 2) + '\n',
    );
    console.log('✅ Allowlist updated!');
  }

  process.exit(1);
} else {
  console.log('\n✅ No drift detected. Persisted queries are in sync.');
  process.exit(0);
}
