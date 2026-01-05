#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const options = {
  path: { type: 'string', default: 'dist/release' },
};

const { values } = parseArgs({ options, strict: false });

const BUNDLE_DIR = resolve(values.path);

console.log(`🔍 Verifying Release Bundle at: ${BUNDLE_DIR}`);

if (!existsSync(BUNDLE_DIR)) {
    console.error(`❌ Bundle directory not found: ${BUNDLE_DIR}`);
    process.exit(1);
}

const REQUIRED_FILES = [
    'release-manifest.json',
    'release-notes.md',
    'checksums.txt'
];

let errors = 0;

// 1. Check existence of key files
for (const file of REQUIRED_FILES) {
    if (!existsSync(join(BUNDLE_DIR, file))) {
        console.error(`❌ Missing required file: ${file}`);
        errors++;
    } else {
        console.log(`✅ Found ${file}`);
    }
}

// 2. Check SBOMs (expect at least one if "sboms" dir exists, or warn)
const sbomDir = join(BUNDLE_DIR, 'sboms');
if (existsSync(sbomDir)) {
    const sboms = readdirSync(sbomDir).filter(f => f.endsWith('.json'));
    if (sboms.length === 0) {
        console.warn('⚠️  SBOM directory exists but is empty.');
    } else {
        console.log(`✅ Found ${sboms.length} SBOM(s).`);
    }
} else {
    console.warn('⚠️  No sboms/ directory found.');
}

// 3. Check Manifest Validity
const manifestPath = join(BUNDLE_DIR, 'release-manifest.json');
if (existsSync(manifestPath)) {
    try {
        const content = readFileSync(manifestPath, 'utf-8');
        const json = JSON.parse(content);
        if (!json.tag || !json.sha || !json.generated_at) {
             console.error('❌ Manifest missing required fields (tag, sha, generated_at)');
             errors++;
        } else {
            console.log(`✅ Manifest valid (Tag: ${json.tag}, SHA: ${json.sha.substring(0,7)})`);
        }
    } catch (e) {
        console.error('❌ Failed to parse release-manifest.json');
        errors++;
    }
}

// 4. Check Checksums Validity (basic check)
const checksumsPath = join(BUNDLE_DIR, 'checksums.txt');
if (existsSync(checksumsPath)) {
    const content = readFileSync(checksumsPath, 'utf-8');
    if (content.trim().length === 0) {
        console.warn('⚠️  checksums.txt is empty.');
    } else {
        console.log('✅ checksums.txt populated.');
    }
}

if (errors > 0) {
    console.error(`\n❌ Verification failed with ${errors} error(s).`);
    process.exit(1);
} else {
    console.log('\n✨ Bundle Verified Successfully!');
    process.exit(0);
}
