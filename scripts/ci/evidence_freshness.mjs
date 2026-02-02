import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    manifest: 'docs/governance/evidence-required.json',
    out: 'artifacts/evidence_freshness_report.json'
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--manifest') {
      args.manifest = argv[++i];
    } else if (arg === '--out') {
      args.out = argv[++i];
    }
  }
  return args;
}

function getCommitDate(file) {
  try {
    // If file is passed, get its last commit. If not (null), get HEAD commit.
    const cmd = file
      ? `git log -1 --format=%cI -- "${file}"`
      : `git show -s --format=%cI HEAD`;
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    return output ? new Date(output) : null;
  } catch (error) {
    return null;
  }
}

function calculateAgeDays(date, referenceDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = referenceDate.getTime() - date.getTime();
  return Math.floor(diff / msPerDay);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Checking evidence freshness...`);
  console.log(`Manifest: ${args.manifest}`);

  const manifestPath = resolve(process.cwd(), args.manifest);
  if (!existsSync(manifestPath)) {
    console.error(`Manifest file not found: ${manifestPath}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.error(`Error parsing manifest: ${e.message}`);
    process.exit(1);
  }

  if (!manifest.required_files || !Array.isArray(manifest.required_files)) {
    console.error('Invalid manifest format: missing required_files array');
    process.exit(1);
  }

  const headDate = getCommitDate(null);
  if (!headDate) {
    console.error('Unable to determine HEAD commit date.');
    process.exit(1);
  }

  const results = [];
  let failed = false;

  for (const item of manifest.required_files) {
    const filePath = item.path;
    const absPath = resolve(process.cwd(), filePath);
    const exists = existsSync(absPath);

    let lastCommitDate = null;
    let ageDays = null;
    let status = 'fail';
    let message = '';

    if (!exists) {
      message = 'File missing';
    } else {
      lastCommitDate = getCommitDate(filePath);
      if (!lastCommitDate) {
          try {
             execSync(`git ls-files --error-unmatch "${filePath}"`, { stdio: 'ignore' });
             message = 'No commit history found';
          } catch (e) {
             message = 'File not tracked by git';
          }
      } else {
        ageDays = calculateAgeDays(lastCommitDate, headDate);
        if (ageDays <= item.threshold_days) {
          status = 'pass';
          message = 'Fresh';
        } else {
          message = `Stale (age: ${ageDays} days, limit: ${item.threshold_days})`;
          status = 'fail';
        }
      }
    }

    if (status === 'fail') failed = true;

    results.push({
      path: filePath,
      exists,
      last_commit_date: lastCommitDate ? lastCommitDate.toISOString() : null,
      age_days: ageDays,
      threshold_days: item.threshold_days,
      owner: item.owner,
      status,
      message
    });
  }

  const report = {
    head_commit_date: headDate.toISOString(),
    manifest: args.manifest,
    results
  };

  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${outPath}`);

  if (failed) {
    console.error('FAILURE: Evidence freshness check failed!');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.error(`- ${r.path}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('SUCCESS: All required evidence is fresh.');
  }
}

main();
