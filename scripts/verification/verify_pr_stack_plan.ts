import fs from 'fs';
import path from 'path';

const MD_PATH = path.join(process.cwd(), 'docs', 'PR_STACK_PLAN.md');
const JSON_PATH = path.join(process.cwd(), 'docs', 'PR_STACK_PLAN.json');

function verify() {
  console.log('Verifying PR Stack Plan...');

  if (!fs.existsSync(MD_PATH)) {
    console.error(`ERROR: ${MD_PATH} not found.`);
    process.exit(1);
  }

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`ERROR: ${JSON_PATH} not found.`);
    process.exit(1);
  }

  const mdContent = fs.readFileSync(MD_PATH, 'utf-8');
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  } catch (e) {
    console.error(`ERROR: Failed to parse ${JSON_PATH}:`, e);
    process.exit(1);
  }

  // 1. Check if MD contains required sections
  const requiredSections = [
    'Current PR Inventory',
    'Ownership Boundaries',
    'Merge Order & Rebase Policy'
  ];

  const missingSections = requiredSections.filter(section => !mdContent.includes(section));
  if (missingSections.length > 0) {
    console.error(`ERROR: MD missing sections: ${missingSections.join(', ')}`);
    process.exit(1);
  }

  // 2. Check if every PR in JSON is mentioned in MD
  const missingPRs = plan.inventory.filter((pr: any) => !mdContent.includes(`#${pr.pr_number}`));
  if (missingPRs.length > 0) {
    console.error(`ERROR: The following PRs from JSON are missing in MD: ${missingPRs.map((p: any) => p.pr_number).join(', ')}`);
    process.exit(1);
  }

  // 3. Check ownership boundaries in MD
  if (!mdContent.includes('Claude') || !mdContent.includes('Codex') || !mdContent.includes('Jules')) {
    console.error('ERROR: Ownership boundaries for Claude, Codex, or Jules are missing in MD.');
    process.exit(1);
  }

  console.log('SUCCESS: PR Stack Plan verified.');
}

verify();
