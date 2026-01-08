#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

const options = {
  evidence: { type: 'string' },
};

const { values } = parseArgs({ options, strict: false });

if (!values.evidence) {
  console.error('❌ Error: --evidence <path> is required.');
  process.exit(1);
}

const EVIDENCE_FILE = values.evidence;
const EVIDENCE_DIR = dirname(EVIDENCE_FILE);
let errors = [];

console.log(`🔍 Validating Evidence Bundle in: ${EVIDENCE_DIR}`);

if (!existsSync(EVIDENCE_FILE)) {
    console.error(`❌ Evidence manifest not found: ${EVIDENCE_FILE}`);
    process.exit(1);
}

let evidence;
try {
    evidence = JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8'));
} catch (e) {
    console.error(`❌ Failed to parse evidence file: ${e.message}`);
    process.exit(1);
}

// 1. Check for bundle object
if (!evidence.bundle) {
    errors.push('Missing required "bundle" object');
} else {
    // 2. Validate bundle fields
    if (evidence.bundle.algorithm !== 'sha256') {
        errors.push(`Invalid bundle.algorithm: expected "sha256", got "${evidence.bundle.algorithm}"`);
    }
    if (evidence.bundle.source !== 'SHA256SUMS') {
         errors.push(`Invalid bundle.source: expected "SHA256SUMS", got "${evidence.bundle.source}"`);
    }
    if (!evidence.bundle.digest) {
         errors.push('Missing bundle.digest');
    } else if (!/^[a-f0-9]{64}$/.test(evidence.bundle.digest)) {
         errors.push(`Invalid bundle.digest format: expected 64 hex characters, got "${evidence.bundle.digest}"`);
    }

    // 3. Validate evidence bundle completeness
    const sumsPath = join(EVIDENCE_DIR, evidence.bundle.source || 'SHA256SUMS');
    if (!existsSync(sumsPath)) {
        errors.push(`Evidence bundle source file not found: ${sumsPath}`);
    } else {
        const sumsContent = readFileSync(sumsPath, 'utf8');
        const filesInBundle = sumsContent.trim().split('\n');

        if (filesInBundle.length === 1 && filesInBundle[0] === '') {
             errors.push('SHA256SUMS file is empty.');
        } else {
            for (const line of filesInBundle) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 2) continue; // Skip empty or invalid lines
                // Handle filenames with spaces - the checksum is first, the rest is the filename.
                const filename = parts.slice(1).join(' ');
                const filePath = join(EVIDENCE_DIR, filename);
                const sigPath = `${filePath}.sig`;

                // Check for file existence
                if (!existsSync(filePath)) {
                    errors.push(`Missing evidence file listed in SHA256SUMS: ${filename}`);
                }

                // Check for signature existence
                if (!existsSync(sigPath)) {
                    errors.push(`Missing signature for evidence file: ${filename}.sig`);
                }
            }
        }
    }
}

if (errors.length > 0) {
    console.error('❌ Evidence validation failed:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
} else {
    console.log('✅ Evidence validation passed (schema compliance and bundle completeness)');
}
