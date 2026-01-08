
import fs from 'fs';
import path from 'path';

console.log('Generating weekly report...');

// Simplified logic for Phase 4 integration
const TRACKER_FILE = 'docs/releases/MVP-4_GA_ISSUANCE_WORKSHEET.md';
const STABILIZATION_DIR = 'docs/releases/stabilization-evidence';

function checkEvidenceCompliance() {
    if (!fs.existsSync(TRACKER_FILE)) return { doneWithoutEvidence: 0, missingItems: [] };

    const content = fs.readFileSync(TRACKER_FILE, 'utf-8');
    const lines = content.split('\n');
    let doneWithoutEvidence = 0;
    let missingItems = [];

    lines.forEach(line => {
        if (line.includes('ISS-') && line.includes('DONE')) {
            const parts = line.split('|').map(p => p.trim());
            const id = parts[1];
            const evidenceLink = parts[7];

            let hasEvidence = false;
            if (evidenceLink && evidenceLink !== '') {
                const linkPath = path.join(path.dirname(TRACKER_FILE), evidenceLink);
                if (fs.existsSync(linkPath)) {
                     const evContent = fs.readFileSync(linkPath, 'utf-8');
                     if (evContent.includes('**Result**: PASS')) {
                         hasEvidence = true;
                     }
                }
            }

            if (!hasEvidence) {
                doneWithoutEvidence++;
                missingItems.push(id);
            }
        }
    });

    return { doneWithoutEvidence, missingItems };
}

const compliance = checkEvidenceCompliance();
console.log(`DONE without evidence: ${compliance.doneWithoutEvidence}`);
if (compliance.missingItems.length > 0) {
    console.log(`Items missing evidence: ${compliance.missingItems.join(', ')}`);
}

// ... rest of the report generation ...
