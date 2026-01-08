import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const DIFF_PATH = path.join(rootDir, 'dist/evidence/deps/deps-diff.json');
const APPROVAL_PATH = path.join(rootDir, 'dist/evidence/approvals/deps-approval.json');
const POLICY_PATH = path.join(rootDir, 'policy/release-deps-policy.json');

function main() {
  console.log('Verifying Dependency Approval Integrity...');

  if (!fs.existsSync(DIFF_PATH)) {
    console.error(`Error: Diff not found at ${DIFF_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(APPROVAL_PATH)) {
    console.error(`Error: Approval record not found at ${APPROVAL_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(POLICY_PATH)) {
    console.error(`Error: Policy not found at ${POLICY_PATH}`);
    process.exit(1);
  }

  // Load Policy to check authorized approvers
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));
  const authorizedApprovers = policy.approvers || [];

  // Calculate current hash
  const diffContent = fs.readFileSync(DIFF_PATH);
  const currentDiffHash = crypto.createHash('sha256').update(diffContent).digest('hex');
  console.log(`Current Diff Hash: ${currentDiffHash}`);

  // Read approval
  const approvals = JSON.parse(fs.readFileSync(APPROVAL_PATH, 'utf-8'));
  const list = Array.isArray(approvals) ? approvals : [approvals];

  if (list.length === 0) {
    console.error('Error: Approval file is empty or invalid.');
    process.exit(1);
  }

  // Verify at least one valid approval matches the current diff AND is authorized
  const validApproval = list.find((a: any) => {
    if (a.diffHash !== currentDiffHash) {
      console.warn(`[WARN] Approval by ${a.approver} has mismatching hash: ${a.diffHash}`);
      return false;
    }
    if (a.policyStatus !== 'NEEDS_APPROVAL' && a.policyStatus !== 'PASS') {
        console.warn(`[WARN] Approval by ${a.approver} has invalid status: ${a.policyStatus}`);
        return false;
    }
    if (!authorizedApprovers.includes(a.approver)) {
        console.warn(`[WARN] Approval by ${a.approver} is NOT AUTHORIZED by policy.`);
        return false;
    }
    return true;
  });

  if (!validApproval) {
    console.error('FATAL: No valid approval found for the current dependency diff.');
    console.error(`Expected Hash: ${currentDiffHash}`);
    console.error(`Authorized Approvers: ${authorizedApprovers.join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ Verified valid approval by ${validApproval.approver} for hash ${currentDiffHash.substring(0,8)}...`);
}

main();
