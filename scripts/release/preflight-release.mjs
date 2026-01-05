import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
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

// Determine Channel
const isRc = TAG.includes('-rc.');
const channel = isRc ? 'rc' : 'ga';
console.log(`ℹ️  Identified channel: ${channel}`);

// 3. Resolve Tag SHA
const sha = run(`git rev-parse ${TAG}`);
if (!sha) {
  fail(`Tag ${TAG} not found.`);
}
console.log(`✅ Tag resolved to SHA: ${sha}`);

// 4. Check Ancestry and Determine Mode
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';
let mode = null;
let originRef = `origin/${defaultBranch}`;

// Check default branch ancestry
if (!run(`git rev-parse --verify ${originRef}`)) {
    console.log(`ℹ️ ${originRef} not found, attempting fetch...`);
    try {
        execSync(`git fetch origin ${defaultBranch} --depth=1`, { stdio: 'inherit' });
    } catch (e) {
        console.warn(`⚠️ Failed to fetch origin/${defaultBranch}. Ancestry check might fail if ref is missing.`);
    }
}

try {
  execSync(`git merge-base --is-ancestor ${sha} ${originRef}`, { stdio: 'ignore' });
  mode = 'default-branch';
  console.log(`✅ Tag is reachable from ${originRef} (mode: default-branch)`);
} catch (e) {
  console.log(`ℹ️  Tag is NOT reachable from ${originRef}. Checking series branches...`);
}

// If not on default, check series branches
if (!mode) {
  // Logic: Check if reachable from origin/release/vX.Y where X.Y matches tag
  const majorMinor = versionExpected.split('.').slice(0, 2).join('.');
  const seriesBranchRef = `origin/release/v${majorMinor}`;

  if (run(`git rev-parse --verify ${seriesBranchRef}`)) {
    try {
      execSync(`git merge-base --is-ancestor ${sha} ${seriesBranchRef}`, { stdio: 'ignore' });
      mode = 'series-branch';
      console.log(`✅ Tag is reachable from ${seriesBranchRef} (mode: series-branch)`);
    } catch (e) {
      console.log(`ℹ️  Tag is NOT reachable from ${seriesBranchRef}.`);
    }
  } else {
    console.log(`ℹ️  Series branch ${seriesBranchRef} does not exist.`);
  }
}

if (!mode) {
  fail(`Tag ${TAG} is not reachable from default branch (${defaultBranch}) or matching series branch.`);
}

// 5. Apply Policy
const POLICY_PATH = join(process.cwd(), 'release-policy.yml');
let policyApplied = false;
let policyDecision = 'allowed'; // Default if no policy blocks it
let policyReason = 'No channel policy defined';

if (existsSync(POLICY_PATH)) {
  try {
    const policyContent = readFileSync(POLICY_PATH, 'utf8');
    const policy = yaml.load(policyContent);

    if (policy.channels && policy.channels[channel]) {
      const channelConfig = policy.channels[channel];
      policyApplied = true;

      if (channelConfig.allowed_from) {
        if (!channelConfig.allowed_from.includes(mode)) {
          fail(`Policy Violation: Channel '${channel}' is not allowed from mode '${mode}'. Allowed: ${channelConfig.allowed_from.join(', ')}`);
        } else {
          policyReason = `Allowed by policy: ${channel} via ${mode}`;
          console.log(`✅ ${policyReason}`);
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ Failed to load or parse release policy: ${e.message}`);
  }
}

// Fallback logic for backward compatibility if no policy applied
if (!policyApplied) {
  if (mode !== 'default-branch') {
     // Historically only default-branch was allowed
     fail(`Legacy Policy Violation: Release tags must be on the default branch (unless configured in release-policy.yml). Mode: ${mode}`);
  }
  console.log(`✅ Allowed by legacy default (default-branch only).`);
}

// 6. Version Check (Existing logic)
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

checkPackage('package.json', 'ROOT');
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

// 7. Write Output
const outputDir = 'dist/release';
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const result = {
  tag: TAG,
  sha,
  defaultBranch,
  mode,
  channel,
  policyApplied,
  policyDecision,
  versionExpected,
  mismatches
};

writeFileSync(join(outputDir, 'preflight.json'), JSON.stringify(result, null, 2));
console.log(`📝 Wrote preflight results to ${join(outputDir, 'preflight.json')}`);

// Summary for CI
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    `### Preflight Checks Passed`,
    `- **Tag**: ${TAG}`,
    `- **Channel**: ${channel}`,
    `- **Mode**: ${mode}`,
    `- **Policy**: ${policyReason}`
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
}
