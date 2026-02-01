#!/usr/bin/env node

/**
 * emit_deterministic_attestation.mjs
 * 
 * Generates a deterministic attestation.json for PR gating.
 * Avoids runtime timestamps to ensure local reproducibility.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { crypto } from 'crypto';

const OUTPUT_FILE = 'attestation.json';

function getGitSha() {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return 'unknown';
    }
}

function getLockfileHash() {
    try {
        const lockfile = fs.readFileSync('pnpm-lock.yaml');
        return crypto.createHash('sha256').update(lockfile).digest('hex');
    } catch (e) {
        return 'no-lockfile';
    }
}

function generateAttestation() {
    const attestation = {
        version: '1.0.0',
        subject: 'summit-platform',
        git_sha: getGitSha(),
        lockfile_hash: getLockfileHash(),
        build_context: 'deterministic-pr-gate',
        // We intentionally omit timestamps here to keep it deterministic locally.
        // CI-specific metadata like job_id will be added by the CI runner.
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(attestation, null, 2));
    console.log(`✅ Attestation generated: ${OUTPUT_FILE}`);
}

generateAttestation();
