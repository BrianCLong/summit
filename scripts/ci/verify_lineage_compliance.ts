import * as fs from 'fs';
import * as path from 'path';

const REQUIRED_KEYWORDS = [
    'Replayable Lineage',
    'Deterministic IDs',
    'Idempotency'
];

async function verify() {
    console.log('Verifying Lineage Compliance...');

    // 1. Check AGENTS.md
    const agentsPath = path.join(process.cwd(), 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
        const content = fs.readFileSync(agentsPath, 'utf-8');
        const missing = REQUIRED_KEYWORDS.filter(k => !content.includes(k));

        if (missing.length > 0) {
            console.error(`AGENTS.md is missing required governance mandates: ${missing.join(', ')}`);
            process.exit(1);
        }
        console.log('AGENTS.md contains required mandates.');
    } else {
        console.warn('AGENTS.md not found. Skipping check.');
    }

    // 2. Check Ledger Code (heuristic)
    const ledgerPath = path.join(process.cwd(), 'server/src/provenance/ledger.ts');
    if (fs.existsSync(ledgerPath)) {
        const content = fs.readFileSync(ledgerPath, 'utf-8');
        if (!content.includes('ON CONFLICT') && !content.includes('Idempotency')) {
             console.error('ProvenanceLedger implementation does not appear to handle idempotency (missing ON CONFLICT or "Idempotency" check).');
             process.exit(1);
        }
        console.log('ProvenanceLedger appears to handle idempotency.');
    }

    console.log('Lineage Compliance Verification Passed.');
}

verify();
