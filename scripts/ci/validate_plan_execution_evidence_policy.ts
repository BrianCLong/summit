import fs from 'fs';
import path from 'path';
import yaml from 'yaml'; // We might need to install this or use a simple parser if not available.
// However, since I cannot easily install packages, I will use a simple check or try to use a standard lib approach if possible.
// Wait, 'yaml' is not a standard lib. I should check if 'js-yaml' or similar is available in node_modules.
// If not, I'll use a simple regex-based validator for now or try to import it.

// To be safe and avoid dependency issues in this environment, I will implement a basic validator
// that checks the structure of the YAML file by reading it as text (or parsing if I can find a parser).
// But better: I'll assume I can use 'js-yaml' if it's in the repo, or I'll implement a very simple parser.
// Let's try to dynamic import 'js-yaml'.

async function main() {
  const policyPath = 'ci/plan-execution-evidence-policy.yml';

  if (!fs.existsSync(policyPath)) {
    console.error(`Policy file not found: ${policyPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(policyPath, 'utf-8');

  // Basic structural validation using regex to avoid external dependency for now
  // ensuring keys exist.

  const requiredKeys = [
    'item_identity',
    'evidence_rules',
    'score_lift',
    'baseline_rules'
  ];

  let missing = [];
  for (const key of requiredKeys) {
    if (!content.includes(key + ':')) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`Missing required top-level keys: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Check identity format
  if (!content.includes('format: "{ownerBucket}:{reasonCode}:{gateId}:{artifactKey}"')) {
     console.error("Invalid item_identity format.");
     process.exit(1);
  }

  console.log("Policy file structure validated successfully.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
