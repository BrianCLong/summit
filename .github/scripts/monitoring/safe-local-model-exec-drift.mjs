import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../');

const EXPECTED_FLAGS = [
  '--read-only',
  '--user "$MODEL_USER"',
  '--network none',
  '--security-opt "no-new-privileges:true"',
  '--security-opt "seccomp=$SECCOMP_PROFILE"'
];

function checkRunnerDrift() {
  const runnerPath = join(REPO_ROOT, 'tools/model-sandbox/run.sh');
  if (!existsSync(runnerPath)) {
    console.error("❌ Runner script missing!");
    return 1;
  }

  const content = readFileSync(runnerPath, 'utf8');
  let issues = 0;

  for (const flag of EXPECTED_FLAGS) {
    if (!content.includes(flag)) {
      console.error(`❌ DRIFT: Hardening flag missing from runner: ${flag}`);
      issues++;
    }
  }

  return issues;
}

function checkPolicyDrift() {
  const policyFiles = [
    '.github/policies/model-sandbox/model-allowlist.yml',
    '.github/policies/model-sandbox/egress-allowlist.yml',
    '.github/policies/model-sandbox/security-profile.json',
    '.github/policies/model-sandbox/data-classification.yml'
  ];

  let issues = 0;
  for (const file of policyFiles) {
    if (!existsSync(join(REPO_ROOT, file))) {
      console.error(`❌ DRIFT: Policy file missing: ${file}`);
      issues++;
    }
  }
  return issues;
}

const totalIssues = checkRunnerDrift() + checkPolicyDrift();
if (totalIssues > 0) {
  console.error(`\nTotal drift issues detected: ${totalIssues}`);
  process.exit(1);
} else {
  console.log("✅ No drift detected in model sandbox configuration.");
}
