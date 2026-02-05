import { writeFileSync, mkdirSync } from 'node:fs';
import { generateManifest, canonicalize, computeDigest } from './manifest.js';
import { generateSLSAPredicate } from './slsa.js';

const runId = process.argv[2];
const outputDir = process.argv[3] || '.';

if (!runId) {
  console.error('Usage: summit-attest <runId> [outputDir]');
  process.exit(1);
}

if (outputDir !== '.') {
  mkdirSync(outputDir, { recursive: true });
}

const manifest = generateManifest(runId, [], []);
const manifestContent = canonicalize(manifest);
const manifestDigest = computeDigest(manifestContent);

writeFileSync(`${outputDir}/run-manifest.json`, manifestContent);

const runUri = `openlineage://default/summit/jobs/run/${runId}`;
const predicate = generateSLSAPredicate(runId, runUri, manifestDigest);

writeFileSync(`${outputDir}/slsa-predicate.json`, JSON.stringify(predicate, null, 2));

console.log(`Generated run-manifest.json and slsa-predicate.json for run ${runId}`);
console.log(`Manifest SHA256: ${manifestDigest}`);
