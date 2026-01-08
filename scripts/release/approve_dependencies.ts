import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const POLICY_RESULT_PATH = path.join(rootDir, 'dist/evidence/deps/policy-check.json');
const DIFF_PATH = path.join(rootDir, 'dist/evidence/deps/deps-diff.json');
const APPROVAL_PATH = path.join(rootDir, 'dist/evidence/approvals/deps-approval.json');

function main() {
  const args = process.argv.slice(2);
  const approver = args[0];
  const decision = args[1]; // APPROVE / DENY
  const rationale = args[2];

  if (!approver || !decision || !rationale) {
    console.log('Usage: npx tsx scripts/release/approve_dependencies.ts <approver_username> <APPROVE|DENY> "<rationale>"');
    process.exit(1);
  }

  if (!fs.existsSync(POLICY_RESULT_PATH)) {
    console.error('Error: Policy check result not found. Run check_policy.ts first.');
    process.exit(1);
  }

  const policyResult = JSON.parse(fs.readFileSync(POLICY_RESULT_PATH, 'utf-8'));

  if (policyResult.status === 'PASS') {
    console.log('No approval required according to policy.');
    // We can still record an optional approval if desired, but let's exit for now
    // process.exit(0);
  }

  // Calculate Diff Checksum for binding
  const diffContent = fs.readFileSync(DIFF_PATH);
  const diffHash = crypto.createHash('sha256').update(diffContent).digest('hex');

  const approvalRecord = {
    schemaVersion: "1.0",
    timestamp: new Date().toISOString(),
    releaseTag: process.env.GITHUB_REF_NAME || "HEAD",
    commitSha: process.env.GITHUB_SHA || "unknown",
    diffHash: diffHash,
    policyStatus: policyResult.status,
    approver: approver,
    decision: decision.toUpperCase(),
    rationale: rationale,
    signature: "simulated-signature-placeholder" // In real world, use GPG/Sigstore
  };

  const approvalDir = path.dirname(APPROVAL_PATH);
  if (!fs.existsSync(approvalDir)) {
    fs.mkdirSync(approvalDir, { recursive: true });
  }

  // If file exists, we might want to append to a list, but for now we overwrite or create a list
  // The prompt asked for "deps-approval.json", implying a single record or a collection.
  // I'll make it a list to support multiple approvers.

  let approvals = [];
  if (fs.existsSync(APPROVAL_PATH)) {
    try {
      const content = fs.readFileSync(APPROVAL_PATH, 'utf-8');
      approvals = JSON.parse(content);
      if (!Array.isArray(approvals)) approvals = [approvals];
    } catch (e) {
      approvals = [];
    }
  }

  approvals.push(approvalRecord);

  fs.writeFileSync(APPROVAL_PATH, JSON.stringify(approvals, null, 2));
  console.log(`Approval recorded in ${APPROVAL_PATH}`);
  console.log(`Decision: ${decision}`);
}

main();
