import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

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

// 4. Load Release Policy
const policyPath = join(process.cwd(), 'release-policy.yml');
let policy;
try {
  policy = yaml.load(readFileSync(policyPath, 'utf8'));
} catch (e) {
  fail(`Failed to load release-policy.yml: ${e.message}`);
}

// 5. Determine Channel
let channel = 'ga'; // Default to GA
if (TAG.includes('-rc.')) {
  channel = 'rc';
}

console.log(`ℹ️  Detected channel: ${channel}`);

const channelPolicy = policy.channels[channel];
if (!channelPolicy) {
  fail(`No policy defined for channel '${channel}'`);
}

// 6. Check Ancestry based on Policy
const defaultBranch = policy.default_branch || 'main';
let ancestryAcceptedVia = 'none';
let series = null;
let seriesBranch = null;

const allowedFrom = channelPolicy.allowed_from || [];
console.log(`ℹ️  Channel '${channel}' allows release from: ${allowedFrom.join(', ')}`);

// Check 'default-branch' if allowed
if (allowedFrom.includes('default-branch')) {
  let originRef = `origin/${defaultBranch}`;
  if (!run(`git rev-parse --verify ${originRef}`)) {
      console.log(`ℹ️ ${originRef} not found, attempting fetch...`);
      try {
          execSync(`git fetch origin ${defaultBranch} --depth=1`, { stdio: 'inherit' });
      } catch (e) {
          console.warn(`⚠️ Failed to fetch origin/${defaultBranch}. Ancestry check might fail.`);
      }
  }

  let reachable = false;
  try {
    execSync(`git merge-base --is-ancestor ${sha} ${originRef}`, { stdio: 'ignore' });
    reachable = true;
  } catch (e) {
    reachable = false;
  }

  if (reachable) {
    ancestryAcceptedVia = 'default';
    console.log(`✅ Tag is reachable from ${originRef}`);
  }
}

// Check 'series-branch' if allowed AND not yet accepted
if (ancestryAcceptedVia === 'none' && allowedFrom.includes('series-branch')) {
  // Derive series branch
  const seriesMatch = versionExpected.match(/^(\d+\.\d+)\.\d+$/);
  if (seriesMatch) {
    series = seriesMatch[1];
    seriesBranch = `release/${series}`;
    const seriesRef = `origin/${seriesBranch}`;

    if (run(`git rev-parse --verify ${seriesRef}`)) {
       try {
          execSync(`git merge-base --is-ancestor ${sha} ${seriesRef}`, { stdio: 'ignore' });
          ancestryAcceptedVia = 'series';
          console.log(`✅ Tag is reachable from ${seriesRef}`);
       } catch (e) {
          console.log(`❌ Tag not reachable from ${seriesRef}`);
       }
    } else {
      console.log(`ℹ️ Series branch ${seriesRef} does not exist.`);
    }
  }
}

if (ancestryAcceptedVia === 'none') {
  fail(`Tag ${TAG} (channel: ${channel}) is not reachable from allowed branches: ${allowedFrom.join(', ')}`);
}

// 7. Version Check
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

// Workspaces
const candidates = ['client', 'server'];

if (existsSync('packages')) {
  const pkgs = readdirSync('packages', { withFileTypes: true });
  for (const dirent of pkgs) {
    if (dirent.isDirectory()) {
        candidates.push(join('packages', dirent.name));
    }
  }
}

candidates.forEach(dir => {
  const pkgPath = join(dir, 'package.json');
  checkPackage(pkgPath, dir);
});

if (mismatches.length > 0) {
  fail(`Version mismatch detected. Tag version ${versionExpected} does not match:`, mismatches);
}
console.log(`✅ All package versions match ${versionExpected}`);

// 8. Write Output
const outputDir = 'dist/release';
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const result = {
  tag: TAG,
  sha,
  channel,
  defaultBranch,
  reachableFromDefaultBranch: ancestryAcceptedVia === 'default',
  ancestryAcceptedVia,
  series,
  seriesBranch,
  versionExpected,
  mismatches
};

writeFileSync(join(outputDir, 'preflight.json'), JSON.stringify(result, null, 2));
console.log(`📝 Wrote preflight results to ${join(outputDir, 'preflight.json')}`);
