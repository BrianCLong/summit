#!/usr/bin/env node

/**
 * generate-attestation.mjs
 * 
 * Generates a deterministic attestation.json for PR gating.
 * Captures Git SHA, lockfile hash, and job context.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const options = {
    out: { type: 'string', default: 'attestation.json' },
    job: { type: 'string' },
    deterministic: { type: 'boolean', default: true },
};

const { values } = parseArgs({ options });

function getGitSha() {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return process.env.GITHUB_SHA || 'unknown';
    }
}

function getLockfileHash() {
    const lockfilePath = path.join(process.cwd(), 'pnpm-lock.yaml');
    if (fs.existsSync(lockfilePath)) {
        const content = fs.readFileSync(lockfilePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    return 'missing';
}

function main() {
    const attestation = {
        version: '1.0.0',
        subject: 'intelgraph-platform',
        git_sha: getGitSha(),
        lockfile_hash: getLockfileHash(),
        job_id: values.job || process.env.GITHUB_JOB || 'local',
        build_context: process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual',
    };

    if (!values.deterministic) {
        attestation.timestamp = new Date().toISOString();
    }

    const outFile = values.out;
    const outDir = path.dirname(outFile);
    if (!fs.existsSync(outDir) && outDir !== '.') {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outFile, JSON.stringify(attestation, null, 2));
    console.log(`✅ Deterministic attestation generated at ${outFile}`);
}

main();
