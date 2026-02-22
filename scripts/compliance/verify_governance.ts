import fs from 'fs';
import path from 'path';

const CONTROL_REGISTRY_PATH = 'docs/compliance/CONTROL_REGISTRY.md';
const GOVERNANCE_RULES_PATH = 'docs/governance/GOVERNANCE_RULES.md';

console.log('Verifying Governance Artifacts...');

if (!fs.existsSync(CONTROL_REGISTRY_PATH)) {
    console.error(`ERROR: Control Registry not found at ${CONTROL_REGISTRY_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(GOVERNANCE_RULES_PATH)) {
    console.error(`ERROR: Governance Rules not found at ${GOVERNANCE_RULES_PATH}`);
    process.exit(1);
}

const registryContent = fs.readFileSync(CONTROL_REGISTRY_PATH, 'utf-8');
const rulesContent = fs.readFileSync(GOVERNANCE_RULES_PATH, 'utf-8');

// Basic check for table structures (naïve check)
if (!registryContent.includes('| Control ID |') && !registryContent.includes('| ID |')) {
    console.error('ERROR: Control Registry missing table header');
    process.exit(1);
}

if (!rulesContent.includes('| Type | Description |')) {
    console.error('ERROR: Governance Rules missing Release Types table');
    process.exit(1);
}

console.log('SUCCESS: Governance artifacts present and structurally valid.');
