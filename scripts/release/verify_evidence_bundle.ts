import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const BUNDLE_ROOT = path.join(ARTIFACTS_DIR, 'release-bundles');

function calculateFileChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function verifyBundle() {
    const sha = process.env.GITHUB_SHA || 'local-sha';
    const bundleDir = path.join(BUNDLE_ROOT, sha);

    if (!fs.existsSync(bundleDir)) {
        console.error(`❌ Bundle not found at ${bundleDir}`);
        process.exit(1);
    }

    console.log(`Verifying bundle for SHA: ${sha}`);

    const checksumsPath = path.join(bundleDir, 'checksums.txt');
    if (!fs.existsSync(checksumsPath)) {
        console.error('❌ checksums.txt missing');
        process.exit(1);
    }

    const checksumsContent = fs.readFileSync(checksumsPath, 'utf8');
    const lines = checksumsContent.trim().split('\n');

    let errors = 0;

    for (const line of lines) {
        if (!line.trim()) continue;
        const [expectedChecksum, filePath] = line.split('  ');
        const fullPath = path.join(bundleDir, filePath);

        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Missing file: ${filePath}`);
            errors++;
            continue;
        }

        const actualChecksum = calculateFileChecksum(fullPath);
        if (actualChecksum !== expectedChecksum) {
            console.error(`❌ Checksum mismatch for ${filePath}: expected ${expectedChecksum}, got ${actualChecksum}`);
            errors++;
        }
    }

    // Verify Manifest exists and parses
    const manifestPath = path.join(bundleDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
         console.error('❌ manifest.json missing');
         errors++;
    } else {
        try {
            JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {
            console.error('❌ manifest.json invalid JSON');
            errors++;
        }
    }

    if (errors > 0) {
        console.error(`❌ Bundle verification failed with ${errors} errors.`);
        process.exit(1);
    } else {
        console.log('✅ Bundle verified successfully.');
    }
}

verifyBundle();
