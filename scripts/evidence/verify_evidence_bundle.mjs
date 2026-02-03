
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR
    ? path.resolve(process.env.ARTIFACTS_DIR)
    : path.join(ROOT_DIR, 'artifacts');
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, 'evidence');
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'evidence-manifest.json');

const calculateHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
};

console.log(`🔍 Verifying evidence bundle at: ${EVIDENCE_DIR}`);

if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Evidence manifest not found!');
    process.exit(1);
}

try {
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    const filesMap = manifest.files;
    let failed = false;

    console.log(`📋 Manifest Metadata:`);
    console.log(`   - Timestamp: ${manifest.meta.timestamp}`);
    console.log(`   - Git SHA: ${manifest.meta.gitSha}`);
    console.log(`   - Builder: ${manifest.meta.builder}`);

    console.log(`\n🕵️‍♀️ Verifying ${Object.keys(filesMap).length} artifacts...`);

    for (const [relativePath, metadata] of Object.entries(filesMap)) {
        const fullPath = path.join(ARTIFACTS_DIR, relativePath);

        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Missing artifact: ${relativePath}`);
            failed = true;
            continue;
        }

        const currentHash = calculateHash(fullPath);
        if (currentHash !== metadata.sha256) {
            console.error(`❌ Hash mismatch for: ${relativePath}`);
            console.error(`   Expected: ${metadata.sha256}`);
            console.error(`   Actual:   ${currentHash}`);
            failed = true;
        } else {
            // console.log(`✅ Verified: ${relativePath}`);
        }
    }

    if (failed) {
        console.error('\n⛔ Verification FAILED: Artifact integrity compromised or missing files.');
        process.exit(1);
    } else {
        console.log('\n✅ Verification PASSED: All artifacts match manifest.');
        process.exit(0);
    }

} catch (error) {
    console.error('❌ Failed to verify evidence bundle:', error);
    process.exit(1);
}
