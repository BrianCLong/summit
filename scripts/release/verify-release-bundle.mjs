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
    'SHA256SUMS', // Requirement changed from checksums.txt to include SHA256SUMS check logic effectively
];

// Check if checksums.txt exists, if not check for SHA256SUMS, or treat them as aliases
let checksumFile = 'SHA256SUMS';
if (!existsSync(join(BUNDLE_DIR, 'SHA256SUMS')) && existsSync(join(BUNDLE_DIR, 'checksums.txt'))) {
    checksumFile = 'checksums.txt';
}
// Ensure we verify the checksum file exists
if (!existsSync(join(BUNDLE_DIR, checksumFile))) {
     // We will catch this in the loop below but set it for reference
}

let errors = 0;

// 1. Check existence of key files
for (const file of REQUIRED_FILES) {
    if (file === 'SHA256SUMS' && checksumFile !== 'SHA256SUMS') {
        // Skip strict check if we found checksums.txt instead
        continue;
    }

    if (!existsSync(join(BUNDLE_DIR, file))) {
        // Special handling if using checksums.txt instead
         if (file === 'SHA256SUMS' && existsSync(join(BUNDLE_DIR, 'checksums.txt'))) {
             console.log(`✅ Found checksums.txt (using as SHA256SUMS source)`);
         } else {
            console.error(`❌ Missing required file: ${file}`);
            errors++;
         }
    } else {
        console.log(`✅ Found ${file}`);
    }
}

// 2. Check SBOMs
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

// 4. Check Checksums/SHA256SUMS Validity and Provenance Match
const checksumsPath = join(BUNDLE_DIR, checksumFile);
let sha256Map = new Map();

if (existsSync(checksumsPath)) {
    const content = readFileSync(checksumsPath, 'utf-8');
    if (content.trim().length === 0) {
        console.warn(`⚠️  ${checksumFile} is empty.`);
    } else {
        console.log(`✅ ${checksumFile} populated.`);
        // Parse for provenance verification
        content.split('\n').filter(Boolean).forEach(line => {
             const parts = line.trim().split(/\s+/);
             if (parts.length >= 2) {
                 const hash = parts[0];
                 const name = parts.slice(1).join(' ').replace(/^\*?/, '');
                 sha256Map.set(name, hash);
             }
        });
    }
}

// 5. Verify Provenance (New Requirement)
const provenancePath = join(BUNDLE_DIR, 'provenance.json');
if (existsSync(provenancePath)) {
    console.log('🔍 Verifying Provenance structure and match...');
    try {
        const provContent = readFileSync(provenancePath, 'utf-8');
        const prov = JSON.parse(provContent);

        // Structure checks
        if (!prov.type || prov.type !== "https://in-toto.io/Statement/v1") {
            console.error('❌ Provenance missing or invalid "type" (expected in-toto v1)');
            errors++;
        }
        if (!prov.subject || !Array.isArray(prov.subject)) {
             console.error('❌ Provenance missing "subject" array');
             errors++;
        }
        if (!prov.predicateType) {
             console.error('❌ Provenance missing "predicateType"');
             errors++;
        }

        // Subject vs SHA256SUMS match
        if (prov.subject && sha256Map.size > 0) {
            let matchCount = 0;
            let mismatchCount = 0;

            // Check that every subject in provenance matches SHA256SUMS
            for (const subj of prov.subject) {
                const name = subj.name;
                const digest = subj.digest?.sha256;

                if (!digest) {
                    console.error(`❌ Subject ${name} missing sha256 digest`);
                    mismatchCount++;
                    continue;
                }

                if (sha256Map.has(name)) {
                    if (sha256Map.get(name) === digest) {
                        matchCount++;
                    } else {
                        console.error(`❌ Hash mismatch for ${name}: Provenance=${digest} vs SHA256SUMS=${sha256Map.get(name)}`);
                        mismatchCount++;
                    }
                } else {
                    console.warn(`⚠️  Subject ${name} in provenance but not in ${checksumFile}`);
                }
            }

            // Reverse check: everything in SHA256SUMS should be in provenance (optional strictness, but good for atomic)
            // The prompt says "subject[] entries match SHA256SUMS exactly".
            // This might imply exact set equality.
            for (const [name, hash] of sha256Map.entries()) {
                 const found = prov.subject.find(s => s.name === name);
                 if (!found) {
                     console.error(`❌ File ${name} in ${checksumFile} but missing from Provenance subject[]`);
                     mismatchCount++;
                 }
            }

            if (mismatchCount > 0) {
                errors += mismatchCount;
            } else {
                console.log(`✅ Provenance subjects match ${checksumFile} (${matchCount} files verified)`);
            }
        } else if (sha256Map.size === 0) {
            console.warn('⚠️  Skipping provenance subject match (no checksums loaded)');
        }

    } catch (e) {
        console.error('❌ Failed to parse/verify provenance.json:', e.message);
        errors++;
    }
} else {
    console.warn('⚠️  provenance.json not found in bundle.');
}

if (errors > 0) {
    console.error(`\n❌ Verification failed with ${errors} error(s).`);
    process.exit(1);
} else {
    console.log('\n✨ Bundle Verified Successfully!');
    process.exit(0);
}
