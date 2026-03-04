import fs from 'fs';
import path from 'path';

const WORKFLOW_DIR = '.github/workflows';
const ARCHIVE_DIR = path.join(WORKFLOW_DIR, 'archived');

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
    if (SACRED_WORKFLOWS.has(file)) continue;
    if (file.startsWith('_')) continue;

    const oldPath = path.join(WORKFLOW_DIR, file);
    const newPath = path.join(ARCHIVE_DIR, file);

    const content = fs.readFileSync(oldPath, 'utf8');
    if (content.length < 100 || content.includes('placeholder')) {
        fs.unlinkSync(oldPath);
        deletedCount++;
    } else {
        fs.renameSync(oldPath, newPath);
        archivedCount++;
    }
}

console.log(`Cleanup complete: Archived ${archivedCount}, Deleted ${deletedCount}`);
