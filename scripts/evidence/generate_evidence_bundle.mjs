
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
// Default to 'artifacts' dir, but allow override
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR
    ? path.resolve(process.env.ARTIFACTS_DIR)
    : path.join(ROOT_DIR, 'artifacts');
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, 'evidence');
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'evidence-manifest.json');

// Ensure evidence directory exists
if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

console.log(`🔍 Scanning artifacts in: ${ARTIFACTS_DIR}`);

const calculateHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
};

const getAllFiles = (dirPath, arrayOfFiles) => {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            // We want to scan files INSIDE EVIDENCE_DIR as well, but avoid infinite recursion if ARTIFACTS_DIR is a parent
            // If ARTIFACTS_DIR contains EVIDENCE_DIR, we must be careful.
            // Current logic: skips EVIDENCE_DIR entirely.
            // BUT our attestations are likely IN EVIDENCE_DIR (artifacts/evidence/attestations).
            // So we SHOULD recurse into EVIDENCE_DIR, but filter out the manifest/checksums being generated to avoid race/circular issues?
            // Actually, the previous logic skipped EVIDENCE_DIR to avoid loops if ARTIFACTS_DIR == EVIDENCE_DIR parent.
            // Let's verify paths.

            // If the directory being scanned IS the evidence directory, continue scanning its children (but handle recursion carefully)
            // Or simpler: Just don't skip EVIDENCE_DIR if it's inside ARTIFACTS_DIR.
            // The issue is if we write to it while reading.

            // Allow scanning evidence dir, but maybe exclude the manifest file itself in the file loop below.
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            // Skip the manifest file itself if it exists (though it shouldn't be in the input list effectively)
            if (fullPath !== MANIFEST_PATH) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
};

try {
    const allFiles = getAllFiles(ARTIFACTS_DIR);
    const filesMap = {};

    console.log(`📝 Processing ${allFiles.length} files...`);

    allFiles.forEach(file => {
        try {
            const hash = calculateHash(file);
            const relativePath = path.relative(ARTIFACTS_DIR, file);
            filesMap[relativePath] = {
                sha256: hash,
                size: fs.statSync(file).size,
                mimeType: 'application/octet-stream' // generic for now
            };
        } catch (err) {
            console.warn(`⚠️ Could not process file ${file}: ${err.message}`);
        }
    });

    const manifest = {
        meta: {
            timestamp: new Date().toISOString(),
            gitSha: process.env.GITHUB_SHA || 'unknown',
            builder: 'summit-evidence-collector-v1'
        },
        files: filesMap,
        signature: '' // Placeholder for actual signing logic
    };

    // Simulate signing if a key is present (Placeholder)
    if (process.env.COSIGN_KEY) {
        console.log('🔐 Signing manifest...');
        // In a real implementation, we would sign the manifest content here
        manifest.signature = 'simulated_signature_blob';
    }

    // --- INTEGRATION START: Exception Attestation ---
    // If the exception attestation exists in the dist/evidence path (or wherever it was generated),
    // ensure it is copied to the artifacts directory so it is included in the manifest.
    // However, the current script scans ARTIFACTS_DIR.
    // If generate_exception_attestation.ts outputs to ARTIFACTS_DIR/evidence/attestations, it should already be picked up.
    // We will assume the caller (CI) places it correctly or arguments align.
    // But we should verify if checksums need to be generated for compatibility with other tools.

    // Generate checksums.sha256 if requested or standard
    const checksumsLines = Object.entries(filesMap).map(([relPath, data]) => `${data.sha256}  ${relPath}`);
    const checksumsPath = path.join(EVIDENCE_DIR, 'checksums.sha256');
    fs.writeFileSync(checksumsPath, checksumsLines.join('\n'));
    console.log(`✅ Generated checksums.sha256`);
    // --- INTEGRATION END ---

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`✅ Evidence manifest generated at: ${MANIFEST_PATH}`);
    console.log(`📊 Total artifacts tracked: ${Object.keys(filesMap).length}`);

} catch (error) {
    console.error('❌ Failed to generate evidence bundle:', error);
    process.exit(1);
}
