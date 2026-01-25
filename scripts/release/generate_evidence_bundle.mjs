#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const commitSha = process.env.GITHUB_SHA || 'dev-sha';
  const runId = process.env.GITHUB_RUN_ID || 'dev-run';
  // Use first non-flag argument as output directory
  const outputDir = args.find(a => !a.startsWith('--')) || 'evidence-bundle';

  console.log(`Generating evidence bundle...`);
  console.log(`Commit: ${commitSha}`);
  console.log(`Run ID: ${runId}`);

  const bundle = {
    meta: {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      commit_sha: commitSha,
      workflow_run_id: runId
    },
    artifacts: {
      sbom: 'sbom.json',
      provenance: 'provenance.json',
      test_summary: 'test-results.json'
    }
  };

  if (dryRun) {
    console.log('Dry run: Bundle structure generated.');
    console.log(JSON.stringify(bundle, null, 2));
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'bundle-manifest.json'), JSON.stringify(bundle, null, 2));
  console.log(`Bundle manifest written to ${path.join(outputDir, 'bundle-manifest.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
