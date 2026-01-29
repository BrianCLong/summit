import fs from 'fs';
import path from 'path';

const bundlePath = 'artifacts/evidence-bundle.json';

if (!fs.existsSync(bundlePath)) {
  console.error(`Error: Evidence bundle not found at ${bundlePath}`);
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
console.log('Evidence bundle verified:', bundle.generatedAt);
console.log('Artifacts in bundle:', bundle.bundle.length);
