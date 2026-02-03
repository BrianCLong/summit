import { createHash } from 'crypto';
import { typeDefs } from '../../server/src/graphql/schema.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// This script calculates a hash of the current GraphQL schema (including FactGov)
// and compares it against a known "golden" hash to detect drift.

const OUT_DIR = 'scripts/monitoring/out';
const GOLDEN_HASH_FILE = join(OUT_DIR, 'factgov-schema.hash');

function calculateHash(str: string | object): string {
  const content = typeof str === 'string' ? str : JSON.stringify(str);
  return createHash('sha256').update(content).digest('hex');
}

async function run() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
      mkdirSync(OUT_DIR, { recursive: true });
  }

  // typeDefs can be a string or an array of strings/DocumentNodes
  // We normalize to a single string for hashing
  const schemaString = Array.isArray(typeDefs)
    ? typeDefs.map(d => {
        if (typeof d === 'string') return d;
        if (d && d.loc && d.loc.source) return d.loc.source.body;
        return JSON.stringify(d);
    }).join('\n')
    : typeDefs;

  const currentHash = calculateHash(schemaString);
  console.log(`Current Schema Hash: ${currentHash}`);

  const update = process.argv.includes('--update');

  if (update) {
    writeFileSync(GOLDEN_HASH_FILE, currentHash);
    console.log(`Updated golden hash at ${GOLDEN_HASH_FILE}`);
  } else {
    if (existsSync(GOLDEN_HASH_FILE)) {
      const expectedHash = readFileSync(GOLDEN_HASH_FILE, 'utf-8').trim();
      if (currentHash !== expectedHash) {
        console.error(`DRIFT DETECTED! Expected ${expectedHash}, got ${currentHash}`);
        console.error(`Run with --update to accept the new schema state.`);
        process.exit(1);
      } else {
        console.log('No drift detected. Schema matches golden hash.');
      }
    } else {
      console.warn('No golden hash found. Run with --update to set baseline.');
      // Fail by default if no baseline, to ensure we don't silently pass
      if (!process.env.CI) {
          writeFileSync(GOLDEN_HASH_FILE, currentHash);
          console.log('Created initial golden hash (local dev).');
      } else {
          console.error('CI failure: Golden hash missing.');
          process.exit(1);
      }
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
