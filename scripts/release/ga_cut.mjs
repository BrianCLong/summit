#!/usr/bin/env node

/**
 * GA Cut Script
 * Orchestrates the release cut process.
 *
 * Usage: node scripts/release/ga_cut.mjs --tag v1.0.0 --dry-run
 */

import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const options = {
  tag: { type: 'string' },
  'dry-run': { type: 'boolean', default: false }
};

const run = (cmd, dryRun) => {
    console.log(`> ${cmd}`);
    if (!dryRun) {
        try {
            execSync(cmd, { stdio: 'inherit' });
        } catch (e) {
            console.error(`❌ Command failed: ${cmd}`);
            process.exit(1);
        }
    }
};

async function main() {
  const { values } = parseArgs({ options, strict: false });

  if (!values.tag) {
      console.error("❌ --tag is required");
      process.exit(1);
  }

  const dryRun = values['dry-run'];
  console.log(`✂️  GA Cut: ${values.tag} ${dryRun ? '(DRY RUN)' : ''}`);

  // 1. Verify Checks (Mocking the verification)
  console.log(`\n🔍 Verifying checks...`);
  run('npm run lint', dryRun);
  run('npm test', dryRun);

  // 2. Freeze Dependency Graph
  console.log(`\n❄️  Freezing dependencies...`);
  run('npm ci', dryRun); // Ensure clean install
  // In a real scenario: verify lockfile integrity

  // 3. Regenerate Evidence Bundle
  console.log(`\n📦 Generating evidence...`);
  run('npm run build', dryRun);
  // Generate checksums
  if (!dryRun) {
      execSync('find dist -type f -print0 | sort -z | xargs -0 sha256sum > checksums.txt');
  }
  run('node scripts/release/generate_evidence_bundle.mjs --out .ga/evidence', dryRun);

  // 4. Generate Provenance
  console.log(`\n🔏 Generating provenance...`);
  run(`./scripts/release/generate_provenance_manifest.sh --tag ${values.tag} --sha $(git rev-parse HEAD) --bundle-dir .ga/evidence`, dryRun);

  // 5. Tag Release
  console.log(`\n🏷️  Tagging release...`);
  run(`git tag -a ${values.tag} -m "GA Release ${values.tag}"`, dryRun);

  console.log(`\n✅ GA Cut Complete!`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
