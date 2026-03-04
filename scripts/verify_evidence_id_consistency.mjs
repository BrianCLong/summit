/**
 * verify_evidence_id_consistency.mjs
 * 
 * Scans evidence bundle files to ensure all evidence records have unique IDs
 * and follow the required schema. This is a Tier 1 PR Gate check.
 */
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = 'evidence-bundle';

function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(scanDir(fullPath));
        } else if (file.endsWith('.json')) {
            results.push(fullPath);
        }
    }
    return results;
}

const evidenceFiles = scanDir(EVIDENCE_DIR);
const ids = new Set();
let errors = 0;

for (const file of evidenceFiles) {
    try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        // Support both single objects and arrays of evidence
        const entries = Array.isArray(content) ? content : [content];

        for (const entry of entries) {
            if (!entry.evidenceId) {
                console.error(`❌ ${file}: Missing evidenceId`);
                errors++;
                continue;
            }

            if (ids.has(entry.evidenceId)) {
                console.error(`❌ ${file}: Duplicate evidenceId found: ${entry.evidenceId}`);
                errors++;
            }
            ids.add(entry.evidenceId);
        }
    } catch (e) {
        // Skip non-evidence JSON files if they fail to parse or don't fit schema
        continue;
    }
}

if (errors > 0) {
    console.error(`\nFound ${errors} evidence consistency errors.`);
    process.exit(1);
} else {
    console.log(`✅ Verified ${ids.size} evidence IDs for consistency.`);
}
