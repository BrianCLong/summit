import fs from 'fs';
import yaml from 'js-yaml';

// Args: release-intent (true/false), has-approval (true/false)
// Can be passed as flags or env vars.
// Usage: node enforce_dependency_approval.mjs --release-intent <bool> --has-approval <bool>

const args = process.argv.slice(2);
let isReleaseIntent = process.env.RELEASE_INTENT === 'true';
let hasApproval = process.env.HAS_APPROVAL === 'true';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--release-intent') isReleaseIntent = args[i + 1] === 'true';
  if (args[i] === '--has-approval') hasApproval = args[i + 1] === 'true';
}

const REPORT_PATH = 'artifacts/deps-change/report.json';
const POLICY_PATH = 'release-policy.yml';

function loadJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function loadYaml(path) {
  try {
    return yaml.load(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function enforce() {
  console.log(`Enforcing Dependency Policy: Release Intent = ${isReleaseIntent}, Has Approval = ${hasApproval}`);

  if (!isReleaseIntent) {
    console.log('Not a release-intent PR. Skipping enforcement.');
    process.exit(0);
  }

  const report = loadJson(REPORT_PATH);
  if (!report) {
    console.error('Report not found at ' + REPORT_PATH);
    process.exit(1);
  }

  const policyDoc = loadYaml(POLICY_PATH);
  const policy = policyDoc?.dependency_change_gate || {};

  if (!policy.enabled) {
      console.log('Dependency change gate is disabled in policy.');
      process.exit(0);
  }

  const thresholds = policy.thresholds || {};
  const summary = report.summary;

  const violations = [];
  if (summary.majorBumps >= (thresholds.major_bumps ?? 1)) violations.push(`Major Bumps: ${summary.majorBumps} >= ${thresholds.major_bumps ?? 1}`);
  if (summary.added >= (thresholds.added_deps ?? 3)) violations.push(`Added Deps: ${summary.added} >= ${thresholds.added_deps ?? 3}`);
  if (summary.removed >= (thresholds.removed_deps ?? 3)) violations.push(`Removed Deps: ${summary.removed} >= ${thresholds.removed_deps ?? 3}`);
  if (summary.totalEvents >= (thresholds.total_events ?? 5)) violations.push(`Total Events: ${summary.totalEvents} >= ${thresholds.total_events ?? 5}`);

  if (violations.length > 0) {
    console.log('⚠️ Thresholds exceeded:');
    violations.forEach(v => console.log(`  - ${v}`));

    if (!hasApproval) {
      console.error('\n❌ FAILURE: Explicit approval required for major dependency changes on release-intent PRs.');
      console.error(`Please review the artifacts/deps-change/report.md and add the "${policy.approval_signal?.label || 'deps-approved'}" label to this PR.`);

      // Emit GitHub step summary if environment allows
      if (process.env.GITHUB_STEP_SUMMARY) {
          const message = `### ❌ Dependency Approval Required\n\n` +
              `This PR contains significant dependency changes targeting a release.\n\n` +
              `**Violations:**\n` +
              violations.map(v => `- ${v}`).join('\n') +
              `\n\n**Action Required:**\n` +
              `Review the changes and apply the \`${policy.approval_signal?.label || 'deps-approved'}\` label to proceed.`;
          fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
      }

      process.exit(1);
    } else {
      console.log('✅ Approval signal found. Proceeding.');
    }
  } else {
    console.log('✅ No thresholds exceeded.');
  }
}

enforce();
