import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_DIR = '.github/workflows';
const GUIDELINES_DOC = 'CONTRIBUTING.md';

function checkWorkflow(filename) {
  const filePath = path.join(WORKFLOW_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // Rule 1: Check for pnpm/setup-node order
  const hasPnpmCache = content.includes('cache: pnpm') || content.includes("cache: 'pnpm'") || content.includes('cache: "pnpm"');

  if (hasPnpmCache) {
    if (!content.includes('pnpm/action-setup')) {
      errors.push("Uses pnpm cache but missing 'pnpm/action-setup'");
    } else {
      const firstSetupNode = content.indexOf('actions/setup-node');
      const firstActionSetup = content.indexOf('pnpm/action-setup');
      if (firstSetupNode !== -1 && firstActionSetup !== -1 && firstSetupNode < firstActionSetup) {
        errors.push("'actions/setup-node' appears before 'pnpm/action-setup'. This will break cache calculation.");
      }
    }
  }

  // Rule 2: Prevent recursive triggers on main
  try {
    const parsed = yaml.load(content);
    if (parsed && parsed.on && parsed.on.push && parsed.on.push.branches) {
      const branches = Array.isArray(parsed.on.push.branches) ? parsed.on.push.branches : [parsed.on.push.branches];
      if (branches.includes('main')) {
        const lowerName = (parsed.name || '').toLowerCase();
        if (lowerName.includes('merge') || lowerName.includes('orchestrator') || lowerName.includes('bot')) {
          errors.push("Recursive trigger risk: 'on: push: branches: [main]' detected in a merging workflow.");
        }
      }
    }
  } catch (e) {
    // skip
  }

  // Rule 3: Concurrency groups
  if (!content.includes('concurrency:')) {
    if (content.includes('pull_request:') || content.includes('push:')) {
      errors.push("Missing 'concurrency' group. This can lead to race conditions.");
    }
  }

  return errors;
}

const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
let totalErrors = 0;

console.log("Running CI/CD Workflow Hygiene Audit...");

for (const file of files) {
  const errors = checkWorkflow(file);
  if (errors.length > 0) {
    console.log(`- ${file}:`);
    errors.forEach(err => console.log(`   * ${err}`));
    totalErrors += errors.length;
  }
}

if (totalErrors > 0) {
  console.log(`Audit failed with ${totalErrors} hygiene errors.`);
  process.exit(1);
} else {
  console.log("All workflows passed hygiene audit.");
  process.exit(0);
}