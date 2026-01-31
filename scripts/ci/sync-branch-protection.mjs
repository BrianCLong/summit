
import { Octokit } from '@octokit/rest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

// --- Configuration & Constants ---

const DEFAULT_POLICY_PATH = 'docs/ci/REQUIRED_CHECKS_POLICY.yml';
const DEFAULT_BRANCH = 'main';

// --- Helper Functions ---

function parseArgs() {
  const args = {
    apply: false,
    dryRun: true,
    policyPath: DEFAULT_POLICY_PATH,
    branch: DEFAULT_BRANCH,
    repo: process.env.GITHUB_REPOSITORY,
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.apply = false;
    } else if (arg === '--policy' || arg.startsWith('--policy=')) {
      args.policyPath = arg.includes('=') ? arg.split('=')[1] : argv[++i];
    } else if (arg === '--branch' || arg.startsWith('--branch=')) {
      args.branch = arg.includes('=') ? arg.split('=')[1] : argv[++i];
    } else if (arg === '--repo' || arg.startsWith('--repo=')) {
      args.repo = arg.includes('=') ? arg.split('=')[1] : argv[++i];
    }
  }

  return args;
}

function loadPolicy(policyPath) {
  try {
    const fileContent = readFileSync(resolve(policyPath), 'utf8');
    const policy = yaml.load(fileContent);
    return policy;
  } catch (error) {
    console.error(`Error loading policy from ${policyPath}:`, error.message);
    process.exit(1);
  }
}

function normalizeContexts(contexts) {
  if (!contexts) return [];
  return Array.from(new Set(contexts)).sort();
}

// --- Main Execution ---

async function main() {
  const args = parseArgs();

  console.log('--- Sync Branch Protection ---');
  console.log(`Repo: ${args.repo}`);
  console.log(`Branch: ${args.branch}`);
  console.log(`Policy: ${args.policyPath}`);
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);

  if (!args.repo) {
    console.error('Error: Repository not specified. Set GITHUB_REPOSITORY or use --repo.');
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is not set.');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const [owner, repoName] = args.repo.split('/');

  // 1. Load Policy
  const policy = loadPolicy(args.policyPath);
  const branchPolicy = policy.branch_protection;

  if (!branchPolicy) {
    console.error('Error: Policy file missing "branch_protection" section.');
    process.exit(1);
  }

  if (branchPolicy.branch !== args.branch) {
    console.warn(`Warning: Policy specifies branch "${branchPolicy.branch}", but script targets "${args.branch}".`);
    // We continue, assuming the user knows what they are doing by overriding the branch
  }

  const requiredChecks = branchPolicy.required_status_checks;
  const policyContexts = normalizeContexts(requiredChecks.contexts);
  const policyStrict = requiredChecks.strict;

  console.log('\n--- Policy Requirements ---');
  console.log(`Strict: ${policyStrict}`);
  console.log(`Contexts (${policyContexts.length}):`);
  policyContexts.forEach(c => console.log(`  - ${c}`));

  // 2. Fetch Current Settings
  console.log('\n--- Fetching Current GitHub Settings ---');
  let currentSettings;
  try {
    const { data } = await octokit.repos.getBranchProtection({
      owner,
      repo: repoName,
      branch: args.branch,
    });
    currentSettings = data;
  } catch (error) {
    if (error.status === 404) {
      console.log('Branch protection not found (or branch does not exist). Assuming no protection.');
      currentSettings = { required_status_checks: { contexts: [], strict: false } };
    } else {
      console.error('Error fetching branch protection:', error.message);
      process.exit(1);
    }
  }

  const currentChecks = currentSettings.required_status_checks || { contexts: [], strict: false };
  const currentContexts = normalizeContexts(currentChecks.contexts || currentChecks.checks?.map(c => c.context)); // Handle both old and new API shapes if needed, mostly 'contexts' or 'checks'
  // Note: The octokit response for getBranchProtection usually has 'contexts' in 'required_status_checks'.
  // However, sometimes it returns 'checks' array of objects. Let's inspect the response if we can, but 'contexts' is standard for legacy string contexts.
  // Newer API uses 'checks' which includes app_id. The policy defines string contexts. We assume these map to 'contexts' or simple check names.

  console.log(`Current Strict: ${currentChecks.strict}`);
  console.log(`Current Contexts (${currentContexts.length}):`);
  currentContexts.forEach(c => console.log(`  - ${c}`));

  // 3. Compute Drift
  const missingContexts = policyContexts.filter(c => !currentContexts.includes(c));
  const extraContexts = currentContexts.filter(c => !policyContexts.includes(c));
  const strictMismatch = policyStrict !== currentChecks.strict;

  const driftDetected = missingContexts.length > 0 || extraContexts.length > 0 || strictMismatch;

  console.log('\n--- Drift Analysis ---');
  if (!driftDetected) {
    console.log('✅ Status: SYNCED. No drift detected.');
    process.exit(0);
  }

  console.log('⚠️  Status: DRIFT DETECTED');
  if (strictMismatch) console.log(`  Mismatch: Strict mode (Policy: ${policyStrict}, Current: ${currentChecks.strict})`);
  if (missingContexts.length > 0) {
    console.log('  Missing in GitHub (will be added):');
    missingContexts.forEach(c => console.log(`    + ${c}`));
  }
  if (extraContexts.length > 0) {
    console.log('  Extra in GitHub (will be removed):');
    extraContexts.forEach(c => console.log(`    - ${c}`));
  }

  // 4. Apply or Exit
  if (!args.apply) {
    console.log('\n[DRY-RUN] Run with --apply to enforce policy.');
    // We exit with 1 if there is drift in check mode, so CI fails?
    // The prompt says "sync ... to API". Usually a sync tool should fail if out of sync in check mode.
    // However, if we just want to see output, 0 is fine.
    // Let's exit 1 to signal "Drift Detected" so check workflows fail.
    process.exit(1);
  }

  console.log('\n--- Applying Changes ---');

  // We need to construct the update payload.
  // We only update required_status_checks. We should be careful not to wipe other settings if we use 'updateBranchProtection'.
  // 'updateBranchProtection' replaces ALL protection settings.
  // So we need to merge with existing settings or use a more targeted API if available.
  // But 'required_status_checks' is a sub-object.
  // If we assume we manage the WHOLE branch protection, we just push what we have.
  // But the policy only defines 'required_status_checks'.
  // The 'check_branch_protection_drift.mjs' only checks 'required_status_checks'.

  // Safe approach: Read current protection, overwrite required_status_checks, and update.
  // However, `updateBranchProtection` requires passing ALL parameters (enforce_admins, required_pull_request_reviews, etc.) or they might be reset?
  // Documentation says: "Protecting a branch requires admin or owner permissions to the repository. Passing new protection settings will replace existing protection settings."
  // This is risky if we only want to update status checks.

  // Alternative: Use `repos.updateStatusCheckProtection`.
  // "Update status check protection: Protected branches are available in public repositories..."
  // Endpoint: PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

  try {
    await octokit.repos.updateStatusCheckProtection({
      owner,
      repo: repoName,
      branch: args.branch,
      strict: policyStrict,
      contexts: policyContexts,
    });
    console.log('✅ Successfully updated required status checks.');
  } catch (error) {
    console.error('Error updating branch protection:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
