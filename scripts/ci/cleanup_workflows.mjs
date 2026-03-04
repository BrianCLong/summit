/**
 * cleanup_workflows.mjs
 * 
 * Safely reduces the workflow count to reach the < 25 goal.
 * Archives non-essential workflows by moving them to a subfolder.
 */
import fs from 'fs';
import path from 'path';

const WORKFLOW_DIR = '.github/workflows';
const ARCHIVE_DIR = path.join(WORKFLOW_DIR, 'archived');

// Workflows that MUST stay in the root to be active
const SACRED_WORKFLOWS = new Set([
    'pr-gate.yml',
    'main-validation.yml',
    'server-ci.yml',
    'client-ci.yml',
    'infra-ci.yml',
    '_reusable-ga-readiness.yml',
    '_reusable-slsa-build.yml'
]);

if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

let archivedCount = 0;
let deletedCount = 0;

for (const file of files) {
    // 1. Skip sacred ones
    if (SACRED_WORKFLOWS.has(file)) continue;

    // 2. Skip other reusables
    if (file.startsWith('_')) continue;

    const oldPath = path.join(WORKFLOW_DIR, file);
    const newPath = path.join(ARCHIVE_DIR, file);

    // 3. Selective deletion for clearly redundant or empty ones
    const content = fs.readFileSync(oldPath, 'utf8');
    if (content.length < 100 || content.includes('placeholder')) {
        fs.unlinkSync(oldPath);
        deletedCount++;
        console.log(`🗑️ Deleted redundant: ${file}`);
    } else {
        // 4. Archive the rest
        fs.renameSync(oldPath, newPath);
        archivedCount++;
        console.log(`📦 Archived: ${file}`);
    }
}

console.log(`\nCleanup complete:`);
console.log(`- Archived: ${archivedCount}`);
console.log(`- Deleted: ${deletedCount}`);
console.log(`- Remaining in root: ${fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml')).length}`);
