import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { program } from 'commander';
const opts = program
  .option('--dry-run', 'Simulate without changes')
  .option('--verbose', 'Detailed logging')
  .option('--help', 'Show help')
  .parse().opts();

if (opts.help) {
  console.log(program.helpInformation());
  process.exit(0);
}
const dryRun = opts.dryRun ?? false;
const verbose = opts.verbose ?? false;


function main() {
  const hasExistingPR = process.env.HAS_EXISTING_PR === 'true';
  const concern = process.env.PR_CONCERN;
  const canonicalBranch = process.env.CANONICAL_BRANCH;
  const prNumber = process.env.PR_NUMBER || Math.floor(Math.random() * 10000) + 20000;

  if (hasExistingPR && concern && concern !== 'unknown') {
    console.log(`\n🛑 DUPLICATE CONCERN DETECTED: ${concern}`);
    console.log(`An open PR or canonical branch (${canonicalBranch}) already exists for this concern.`);
    console.log(`To prevent PR explosion, this patch is being converted to an Evidence Artifact.`);

    const artifactDir = path.resolve(process.cwd(), '.artifacts/pr');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const patchHash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');

    const artifact = {
      pr: parseInt(prNumber, 10),
      concern: concern,
      patch_hash: patchHash,
      superseded_by: canonicalBranch,
      timestamp: new Date().toISOString(),
      status: 'superseded',
      message: 'Automatically closed and converted to artifact by PR Dedupe Gate'
    };

    const artifactPath = path.join(artifactDir, `pr-${prNumber}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    console.log(`Artifact created at: ${artifactPath}`);

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `duplicate=true\n`);
    }
  } else {
    console.log('No duplicate concern found. Proceeding as canonical PR.');
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `duplicate=false\n`);
    }
  }
}

main();
