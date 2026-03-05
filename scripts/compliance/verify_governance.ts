import fs from 'fs';
import path from 'path';

const GOVERNANCE_FILE = 'COMPLIANCE_CONTROLS.md';

function verifyGovernance() {
    if (!fs.existsSync(GOVERNANCE_FILE)) {
        console.error(`ERROR: Governance file ${GOVERNANCE_FILE} not found`);
        process.exit(1);
    }

    const content = fs.readFileSync(GOVERNANCE_FILE, 'utf-8');

    // Check for table header (allowing for potential formatting differences like spacing)
    // We check for key columns in order
    if (!content.includes('| Control ID') || !content.includes('| Name') || !content.includes('| Status')) {
        console.error('ERROR: Control Registry missing table header');
        console.error('Expected columns: Control ID, Name, Description, Status');
        process.exit(1);
    }

    console.log('Governance check passed.');
}

verifyGovernance();
