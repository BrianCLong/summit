import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const verifier = 'scripts/ci/verify_subsumption_bundle.mjs';
const manifestPath = 'subsumption/branch-protection-as-code/manifest.yaml';

function run(args) {
  return spawnSync('node', [verifier, ...args], { encoding: 'utf8' });
}

console.log('Running BPAC subsumption bundle verifier tests...');

{
  const result = run([manifestPath]);
  if (result.status !== 0) {
    console.error('FAILED: Expected BPAC manifest to pass.');
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log('PASS: BPAC manifest passes');
}

{
  const tempDir = '.tmp/bpac-manifest-test';
  const tempManifest = path.join(tempDir, 'manifest.yaml');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(
    tempManifest,
    'version: 1\nitem:\n  slug: missing-title\n  type: spec\nclaims:\n  registry: "subsumption/branch-protection-as-code/claims.json"\ndocs: []\nevidence_ids: []\n'
  );

  const result = run([tempManifest]);
  if (result.status === 0) {
    console.error('FAILED: Expected missing fields to fail.');
    process.exit(1);
  }
  if (!result.stderr.includes('item.title')) {
    console.error('FAILED: Expected missing item.title error.');
    process.exit(1);
  }
  console.log('PASS: missing fields fail');
}

console.log('All BPAC subsumption bundle verifier tests passed.');
