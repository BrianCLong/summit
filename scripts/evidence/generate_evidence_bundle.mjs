
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
            // Skip the evidence directory itself to avoid recursion/loops if we run multiple times
            if (fullPath !== EVIDENCE_DIR) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
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
    // Sort files to ensure deterministic processing order
    allFiles.sort();

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

    // Ensure filesMap keys are sorted in the final object for deterministic JSON
    const sortedFilesMap = Object.keys(filesMap).sort().reduce(
      (obj, key) => {
        obj[key] = filesMap[key];
        return obj;
      },
      {}
    );

    const manifest = {
        meta: {
            timestamp: new Date().toISOString(),
            gitSha: process.env.GITHUB_SHA || 'unknown',
            builder: 'summit-evidence-collector-v1'
        },
        files: sortedFilesMap,
        signature: '' // Placeholder for actual signing logic
    };

    // Simulate signing if a key is present (Placeholder)
    if (process.env.COSIGN_KEY) {
        console.log('🔐 Signing manifest...');
        // In a real implementation, we would sign the manifest content here
        manifest.signature = 'simulated_signature_blob';
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`✅ Evidence manifest generated at: ${MANIFEST_PATH}`);
    console.log(`📊 Total artifacts tracked: ${Object.keys(filesMap).length}`);

} catch (error) {
    console.error('❌ Failed to generate evidence bundle:', error);
    process.exit(1);
}
