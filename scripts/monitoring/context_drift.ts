import { buildManifest } from '../../packages/context/src/builder.mjs';
import fs from 'fs';

const manifest = buildManifest();
const files = Object.values(manifest.files);

console.log('Files scanned:', files.map(f => f.path));

// Check for duplicates
const hashes = new Map<string, string[]>();
files.forEach(f => {
  if (!hashes.has(f.hash)) hashes.set(f.hash, []);
  hashes.get(f.hash)?.push(f.path);
});

let driftDetected = false;

console.log('Checking for duplicates...');
hashes.forEach((paths, hash) => {
  if (paths.length > 1) {
    console.warn(`⚠️  Duplicate content found in: ${paths.join(', ')}`);
    driftDetected = true;
  }
});

// Check guidance growth
const guidanceSize = files.filter(f => f.layer === 'guidance').reduce((acc, f) => acc + f.size, 0);
console.log(`Guidance Size: ${guidanceSize} chars`);

const BASELINE = 40000;
if (guidanceSize > BASELINE) {
  console.warn(`⚠️  Guidance size (${guidanceSize}) exceeds baseline (${BASELINE})`);
  // driftDetected = true; // Warn only for now
}

if (driftDetected) {
  console.error('Drift detected.');
  process.exit(1);
} else {
  console.log('✅ No drift detected.');
}
