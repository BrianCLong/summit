import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Utils
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function fail(msg, details = []) {
  console.error(`❌ Preflight Check Failed: ${msg}`);
  if (details.length) {
    console.error('Details:');
    details.forEach(d => console.error(`  - ${d}`));
  }
  process.exit(1);
}

// 1. Determine TAG
const TAG = process.env.TAG || process.env.GITHUB_REF_NAME;
if (!TAG) {
  fail('No TAG provided via TAG or GITHUB_REF_NAME env vars.');
}

console.log(`🔍 Checking release preflight for tag: ${TAG}`);

// 2. Parse/Validate Tag
// Allowed: vX.Y.Z or vX.Y.Z-rc.N
const tagRegex = /^v(\d+)\.(\d+)\.(\d+)(?:-rc\.\d+)?$/;
const match = TAG.match(tagRegex);
if (!match) {
  fail(`Invalid tag format: ${TAG}. Expected vX.Y.Z or vX.Y.Z-rc.N`);
}
const versionExpected = `${match[1]}.${match[2]}.${match[3]}`; // Reconstruct X.Y.Z without rc
const major = match[1];
const minor = match[2];
const series = `${major}.${minor}`;

// 3. Resolve Tag SHA
const sha = run(`git rev-parse ${TAG}`);
if (!sha) {
  fail(`Tag ${TAG} not found.`);
}
console.log(`✅ Tag resolved to SHA: ${sha}`);

// 4. Check Ancestry
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';
const releaseBranchPrefix = process.env.RELEASE_BRANCH_PREFIX || 'release/';

// Resolve refs
const defaultBranchRef = `origin/${defaultBranch}`;
const seriesBranchRef = `origin/${releaseBranchPrefix}${series}`;

// Ensure refs exist or fetch them
const refsToCheck = [defaultBranchRef, seriesBranchRef];
refsToCheck.forEach(ref => {
  if (!run(`git rev-parse --verify ${ref}`)) {
    console.log(`ℹ️ ${ref} not found, attempting fetch...`);
    try {
      // Try to fetch the specific branch name from ref string (e.g. origin/main -> main)
      const branchName = ref.replace('origin/', '');
      execSync(`git fetch origin ${branchName} --depth=1`, { stdio: 'inherit' });
    } catch (e) {
      console.warn(`⚠️ Failed to fetch ${ref}. Ancestry check for this branch might fail.`);
    }
  }
});

let reachableFromDefault = false;
try {
  execSync(`git merge-base --is-ancestor ${sha} ${defaultBranchRef}`, { stdio: 'ignore' });
  reachableFromDefault = true;
} catch (e) {
  reachableFromDefault = false;
}

let reachableFromSeries = false;
try {
  execSync(`git merge-base --is-ancestor ${sha} ${seriesBranchRef}`, { stdio: 'ignore' });
  reachableFromSeries = true;
} catch (e) {
  reachableFromSeries = false;
}

// Decision Logic
let ancestryAcceptedVia = 'none';

if (reachableFromDefault) {
  ancestryAcceptedVia = 'default';
  console.log(`✅ Tag is reachable from default branch ${defaultBranchRef}`);
} else if (reachableFromSeries) {
  ancestryAcceptedVia = 'series';
  console.log(`✅ Tag is reachable from series branch ${seriesBranchRef}`);
} else {
  fail(`Tag ${TAG} is not reachable from default branch '${defaultBranchRef}' OR series branch '${seriesBranchRef}'.`);
}

// 5. Version Check
const mismatches = [];

function checkPackage(path, name) {
  if (!existsSync(path)) return;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    if (pkg.version !== versionExpected) {
      mismatches.push(`${name} (${path}): ${pkg.version} != ${versionExpected}`);
    }
  } catch (e) {
    mismatches.push(`${name} (${path}): Failed to parse package.json`);
  }
}

// Root
checkPackage('package.json', 'ROOT');

// Workspaces - "best effort" scanning based on repo structure knowledge
const candidates = ['client', 'server'];

// Scan packages/*
if (existsSync('packages')) {
  const pkgs = readdirSync('packages', { withFileTypes: true });
  for (const dirent of pkgs) {
    if (dirent.isDirectory()) {
        candidates.push(join('packages', dirent.name));
    }
  }
}

// Check found workspaces
candidates.forEach(dir => {
  const pkgPath = join(dir, 'package.json');
  checkPackage(pkgPath, dir);
});

if (mismatches.length > 0) {
  fail(`Version mismatch detected. Tag version ${versionExpected} does not match:`, mismatches);
}
console.log(`✅ All package versions match ${versionExpected}`);

// 6. Write Output
const outputDir = 'dist/release';
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const result = {
  tag: TAG,
  sha,
  defaultBranch,
  candidateSeriesBranch: `${releaseBranchPrefix}${series}`,
  reachableFromDefaultBranch: reachableFromDefault,
  reachableFromSeriesBranch: reachableFromSeries,
  ancestryAcceptedVia,
  versionExpected,
  mismatches
};

writeFileSync(join(outputDir, 'preflight.json'), JSON.stringify(result, null, 2));
console.log(`📝 Wrote preflight results to ${join(outputDir, 'preflight.json')}`);

// 7. Step Summary (for GitHub Actions)
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = `
### Release Preflight Check Passed ✅

- **Tag**: \`${TAG}\`
- **Ancestry**: Accepted via **${ancestryAcceptedVia === 'default' ? `default branch \`${defaultBranch}\`` : `series branch \`${releaseBranchPrefix}${series}\``}**
- **Version**: \`${versionExpected}\`
  `.trim();
  try {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  } catch (e) {
    console.warn('⚠️ Failed to write GITHUB_STEP_SUMMARY');
  }
}
