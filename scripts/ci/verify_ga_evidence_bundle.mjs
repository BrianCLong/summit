#!/usr/bin/env node
/**
 * verify_ga_evidence_bundle.mjs
 *
 * Strict verifier for GA Evidence Bundles.
 * Checks:
 * 1. Existence of bundle.manifest.json and SHA256SUMS.
 * 2. Manifest schema validation.
 * 3. File integrity via SHA-256 hashes in SHA256SUMS.
 * 4. Cross-reference consistency between manifest and bundle contents.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[✓] ${msg}`),
    error: (msg) => console.error(`[✗] ${msg}`),
};

async function hashFile(filePath) {
    const hash = crypto.createHash('sha256');
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.digest('hex');
}

async function verifyBundle(bundleDir) {
    const manifestPath = path.join(bundleDir, 'bundle.manifest.json');
    const contentsPath = path.join(bundleDir, 'SHA256SUMS');

    log.info(`Verifying GA bundle: ${bundleDir}`);

    // 1. Basic Existence
    if (!fs.existsSync(manifestPath)) {
        log.error('Missing bundle.manifest.json');
        process.exit(1);
    }
    if (!fs.existsSync(contentsPath)) {
        log.error('Missing SHA256SUMS');
        process.exit(1);
    }

    // 2. Manifest Validation
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
        log.error(`Failed to parse manifest: ${err.message}`);
        process.exit(1);
    }

    const requiredFields = ['version', 'commit_sha', 'evidence_items'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            log.error(`Manifest missing required field: ${field}`);
            process.exit(1);
        }
    }

    // 3. File Integrity (sha256sum -c style)
    log.info('Checking file integrity via SHA256SUMS...');
    const contentsRows = fs.readFileSync(contentsPath, 'utf8').trim().split('\n');
    const contentsMap = new Map();

    for (const row of contentsRows) {
        const [hash, file] = row.split('  ');
        if (!hash || !file) continue;
        contentsMap.set(file, hash);

        const fullPath = path.join(bundleDir, file);
        if (!fs.existsSync(fullPath)) {
            log.error(`File listed in SHA256SUMS missing: ${file}`);
            process.exit(1);
        }

        const actualHash = await hashFile(fullPath);
        if (actualHash !== hash) {
            log.error(`Hash mismatch for ${file}:`);
            log.error(`  Expected: ${hash}`);
            log.error(`  Actual:   ${actualHash}`);
            process.exit(1);
        }
    }

    // 4. Cross-reference evidence items
    log.info('Checking manifest cross-references...');
    for (const item of manifest.evidence_items) {
        if (!contentsMap.has(item.path)) {
            log.error(`Evidence item "${item.id}" (${item.path}) not found in SHA256SUMS`);
            process.exit(1);
        }
        if (contentsMap.get(item.path) !== item.sha256) {
            log.error(`Hash mismatch for evidence item "${item.id}" between manifest and SHA256SUMS`);
            process.exit(1);
        }
    }

    log.success('Bundle verification PASSED');
    log.info(`Version: ${manifest.version}`);
    log.info(`Commit:  ${manifest.commit_sha}`);
    log.info(`Items:   ${manifest.evidence_items.length}`);
}

const args = process.argv.slice(2);
const bundleDirArg = args[0] || '.';

verifyBundle(path.resolve(bundleDirArg)).catch(err => {
    log.error(`Verification FAILED: ${err.message}`);
    process.exit(1);
});
