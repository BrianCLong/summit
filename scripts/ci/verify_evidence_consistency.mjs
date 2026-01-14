
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR
    ? path.resolve(process.env.ARTIFACTS_DIR)
    : path.join(ROOT_DIR, 'artifacts');
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, 'evidence');
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'evidence-manifest.json');

// Regex from OPS_EVIDENCE_RETENTION_POLICY.md
// ops-evidence-{LABEL}-{TIMESTAMP}.tar.gz
// release-evidence-vX.Y.Z-{TIMESTAMP}.tar.gz
const VALID_EVIDENCE_REGEX = /^(ops|release)-evidence-[a-zA-Z0-9\-\.]+-[0-9]+\.tar\.gz$/;

const STRICT_MODE = process.argv.includes('--strict');

console.log(`🛡️  Verifying Evidence-ID Consistency...`);
if (STRICT_MODE) console.log(`   (Strict Mode: ENABLED)`);

if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Evidence manifest not found at:', MANIFEST_PATH);
    process.exit(1);
}

try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const files = Object.keys(manifest.files);
    const violations = [];

    files.forEach(relativePath => {
        const filename = path.basename(relativePath);

        // Skip metadata files if they are in the bundle (e.g. checksums.sha256)
        // But the policy implies the bundle IS the tar.gz files.
        // If manifest contains "bad-artifact.txt", we check it.

        if (!VALID_EVIDENCE_REGEX.test(filename)) {
            violations.push({
                file: relativePath,
                issue: 'Invalid Naming Convention',
                expected: 'ops-evidence-{LABEL}-{TIMESTAMP}.tar.gz'
            });
        }
    });

    if (violations.length > 0) {
        console.error(`\n❌ Found ${violations.length} consistency violations:`);
        violations.forEach(v => {
            console.error(`   - [${v.file}] ${v.issue} (Expected: ${v.expected})`);
        });

        if (STRICT_MODE) {
            console.error('\n⛔ Gate FAILED (Strict Mode)');
            process.exit(1);
        } else {
            console.warn('\n⚠️  Violations found but ignored (Non-Strict Mode)');
        }
    } else {
        console.log('\n✅ All evidence artifacts match naming policy.');
    }

} catch (error) {
    console.error('❌ Failed to verify consistency:', error);
    process.exit(1);
}
