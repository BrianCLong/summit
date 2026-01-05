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
  // If run without tag, maybe we can assume checking HEAD if it matches a tag?
  // But requirement is strict.
  fail('No TAG provided via TAG or GITHUB_REF_NAME env vars.');
}

console.log(`🔍 Checking release preflight for tag: ${TAG}`);

// 2. Parse/Validate Tag
// Allowed: vX.Y.Z or vX.Y.Z-rc.N
const tagRegex = /^v(\d+\.\d+\.\d+)(?:-rc\.\d+)?$/;
const match = TAG.match(tagRegex);
if (!match) {
  fail(`Invalid tag format: ${TAG}. Expected vX.Y.Z or vX.Y.Z-rc.N`);
}
const versionExpected = match[1];

// 3. Resolve Tag SHA
const sha = run(`git rev-parse ${TAG}`);
if (!sha) {
  fail(`Tag ${TAG} not found.`);
}
console.log(`✅ Tag resolved to SHA: ${sha}`);

// 4. Check Ancestry
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';

// Check if origin/<defaultBranch> exists, if not try to fetch
let originRef = `origin/${defaultBranch}`;
if (!run(`git rev-parse --verify ${originRef}`)) {
    console.log(`ℹ️ ${originRef} not found, attempting fetch...`);
    try {
        execSync(`git fetch origin ${defaultBranch} --depth=1`, { stdio: 'inherit' });
    } catch (e) {
        console.warn(`⚠️ Failed to fetch origin/${defaultBranch}. Ancestry check might fail if ref is missing.`);
    }
}

let reachable = false;
try {
  execSync(`git merge-base --is-ancestor ${sha} ${originRef}`, { stdio: 'ignore' });
  reachable = true;
} catch (e) {
  reachable = false;
}

if (!reachable) {
  fail(`Tag ${TAG} is not reachable from default branch '${originRef}'. Release tags must be on the default branch.`);
}
console.log(`✅ Tag is reachable from ${originRef}`);

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
// "packages/*", "client", "server"

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
  reachableFromDefaultBranch: reachable,
  versionExpected,
  mismatches
};

writeFileSync(join(outputDir, 'preflight.json'), JSON.stringify(result, null, 2));
console.log(`📝 Wrote preflight results to ${join(outputDir, 'preflight.json')}`);
