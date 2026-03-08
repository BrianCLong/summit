#!/usr/bin/env node
/**
 * run-manifest.js
 * Utility for generating and verifying build manifests.
 * Part of the CI Reproducibility Gate.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const MODE = args.includes('--verify') ? 'VERIFY' : 'GENERATE';
const MANIFEST_PATH = 'run-manifest.json';

function getHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getSourceHash() {
    const filesToHash = [
        'pnpm-lock.yaml',
        'package.json',
        '.nvmrc',
        'turbo.json'
    ];
    const combined = filesToHash
        .filter(f => fs.existsSync(f))
        .map(f => getHash(f))
        .join('|');
    return crypto.createHash('sha256').update(combined).digest('hex');
}

function generate() {
    console.log('Generating build manifest...');

    const manifest = {
        version: '1.0',
        build: {
            id: process.env.GITHUB_RUN_ID || 'local',
            timestamp: new Date().toISOString(),
            commit: process.env.GITHUB_SHA || execSync('git rev-parse HEAD').toString().trim(),
        },
        inputs: {
            pnpm_lock_hash: fs.existsSync('pnpm-lock.yaml') ? getHash('pnpm-lock.yaml') : 'missing',
            source_blueprint_hash: getSourceHash()
        },
        outputs: {
            artifacts: []
        }
    };

    const distPaths = ['server/dist/index.js', 'client/dist/index.html'];
    distPaths.forEach(p => {
        if (fs.existsSync(p)) {
            manifest.outputs.artifacts.push({
                path: p,
                hash: getHash(p)
            });
        }
    });

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`✅ Manifest generated at ${MANIFEST_PATH}`);
}

function verify() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error(`❌ Error: ${MANIFEST_PATH} not found.`);
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    console.log(`Verifying manifest for build ${manifest.build.id}...`);

    let failures = 0;
    manifest.outputs.artifacts.forEach(art => {
        if (!fs.existsSync(art.path)) {
            console.error(`❌ Missing artifact: ${art.path}`);
            failures++;
            return;
        }
        const currentHash = getHash(art.path);
        if (currentHash !== art.hash) {
            console.error(`❌ Hash mismatch for ${art.path}`);
            console.error(`   Expected: ${art.hash}`);
            console.error(`   Actual:   ${currentHash}`);
            failures++;
        } else {
            console.log(`✅ ${art.path} verified.`);
        }
    });

    if (failures > 0) {
        console.error(`\n🚨 Verification FAILED with ${failures} errors.`);
        process.exit(1);
    }

    console.log('\n✅ Build is reproducible and matches manifest.');
}

if (MODE === 'GENERATE') {
    generate();
} else {
    verify();
}
