#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { ReleaseBundleError } from './lib/errors.mjs';

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

const RESULTS = {
    ok: false,
    checked: [],
    errors: [],
    fileCounts: {
        dirCount: 0,
        sumsCount: 0,
        indexCount: 0,
        subjectCount: 0
    }
};

function addError(code, message) {
    console.error(`❌ [${code}] ${message}`);
    RESULTS.errors.push({ code, message });
}

function addCheck(message) {
    console.log(`✅ ${message}`);
    RESULTS.checked.push(message);
}

function getSha256(filePath) {
    const fileBuffer = readFileSync(filePath);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

const SUPPORTED_MAJOR_VERSION = 1;

function checkCompatibility(bundleIndex) {
  if (!bundleIndex || typeof bundleIndex.schemaVersion !== 'string') {
    return {
      compatible: false,
      message: 'schemaVersion field is missing or not a string in bundle-index.json',
      code: 'MISSING_FIELD',
      details: { field: 'schemaVersion' }
    };
  }

  const bundleMajor = parseInt(bundleIndex.schemaVersion.split('.')[0], 10);
  if (isNaN(bundleMajor)) {
    return {
      compatible: false,
      message: `Could not parse major version from schemaVersion: "${bundleIndex.schemaVersion}"`,
      code: 'INVALID_ENUM'
    };
  }

  if (bundleMajor > SUPPORTED_MAJOR_VERSION) {
    return {
      compatible: false,
      message: `Unsupported schema major version. Bundle has ${bundleMajor}, script supports ${SUPPORTED_MAJOR_VERSION}.`,
      code: 'SCHEMA_MAJOR_UNSUPPORTED',
      details: { bundleVersion: bundleIndex.schemaVersion, supportedVersion: `${SUPPORTED_MAJOR_VERSION}.x.x` }
    };
  }

  return { compatible: true, message: 'Schema version is compatible.' };
}

function assertCompatible(bundleIndex) {
    const result = checkCompatibility(bundleIndex);
    if (!result.compatible) {
        throw new ReleaseBundleError(result.code, result.message, result.details);
    }
}

// Helper to list all files recursively
function getFiles(dir) {
    let files = [];
    const list = readdirSync(dir);
    for (const file of list) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat && stat.isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

try {
    // 0. Compatibility Check
    const compatScript = join(process.cwd(), 'scripts/release/check-bundle-compatibility.mjs');
    if (existsSync(compatScript)) {
        console.log('Running compatibility check...');
        try {
            const { execSync } = await import('node:child_process');
            execSync(`node "${compatScript}" --dir "${BUNDLE_DIR}" --strict`, { stdio: 'inherit' });
            addCheck('Compatibility check passed');
        } catch (e) {
             addError('COMPATIBILITY_CHECK_FAILED', 'Compatibility check failed');
        }
    } else {
        console.warn('⚠️ Compatibility script not found, skipping check.');
    }

    // 1. Load SHA256SUMS (Canonical Truth)
    const sumsPath = join(BUNDLE_DIR, 'SHA256SUMS');
    if (!existsSync(sumsPath)) {
        throw new Error('SHA256SUMS not found');
    }

    const sumsContent = readFileSync(sumsPath, 'utf-8');
    const canonicalHashes = new Map(); // filename -> hash

    sumsContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        // Supports "hash  filename" (standard) or "hash filename"
        const match = trimmed.match(/^([a-fA-F0-9]{64})\s+(.+)$/);
        if (match) {
            // Normalized paths to be relative to BUNDLE_DIR and forward slashes
            let filename = match[2].trim();
            // Handle ./ prefix if present
            if (filename.startsWith('./')) filename = filename.substring(2);
            canonicalHashes.set(filename, match[1]);
        }
    });

    RESULTS.fileCounts.sumsCount = canonicalHashes.size;
    addCheck(`Loaded SHA256SUMS with ${canonicalHashes.size} entries`);

    // 2. Directory vs SHA256SUMS
    const allFiles = getFiles(BUNDLE_DIR);
    const filesOnDisk = new Set();

    for (const fullPath of allFiles) {
        const relPath = relative(BUNDLE_DIR, fullPath).split('\\').join('/'); // force posix separators

        // Skip verification artifacts themselves
        if (relPath === 'SHA256SUMS' || relPath === 'verify.json') continue;

        filesOnDisk.add(relPath);

        // A) Ensure file is in SHA256SUMS
        if (!canonicalHashes.has(relPath)) {
            addError('DIR_EXTRA_FILE', `File found on disk but missing from SHA256SUMS: ${relPath}`);
            continue;
        }

        // B) Ensure hash matches
        const computedHash = getSha256(fullPath);
        const expectedHash = canonicalHashes.get(relPath);
        if (computedHash !== expectedHash) {
            addError('HASH_MISMATCH', `Hash mismatch for ${relPath}. Expected ${expectedHash}, got ${computedHash}`);
        }
    }

    RESULTS.fileCounts.dirCount = filesOnDisk.size;

    // C) Ensure every file in SHA256SUMS exists on disk
    for (const [filename, hash] of canonicalHashes) {
        if (!filesOnDisk.has(filename)) {
            addError('DIR_MISSING_FILE', `File listed in SHA256SUMS but missing from disk: ${filename}`);
        }
    }

    if (RESULTS.errors.length === 0) {
         addCheck('Directory contents match SHA256SUMS exactly');
    }


    // 3. Bundle Index Check
    const indexPath = join(BUNDLE_DIR, 'bundle-index.json');
    if (existsSync(indexPath)) {
        try {
            let indexJson;
            try {
                indexJson = JSON.parse(readFileSync(indexPath, 'utf-8'));
            } catch (e) {
                throw new ReleaseBundleError('INVALID_JSON', `Failed to parse bundle-index.json: ${e.message}`, { originalError: e.message });
            }

            assertCompatible(indexJson); // This will throw on major version mismatch

            if (indexJson.files && Array.isArray(indexJson.files)) {
                RESULTS.fileCounts.indexCount = indexJson.files.length;
                indexJson.files.forEach(f => {
                     // f.path, f.sha256
                     if (!canonicalHashes.has(f.path)) {
                         addError('INDEX_EXTRA_FILE', `bundle-index.json lists file not in SHA256SUMS: ${f.path}`);
                     } else if (f.path !== 'bundle-index.json' && canonicalHashes.get(f.path) !== f.sha256) {
                         // Skip hash check for self to avoid circular dependency
                         addError('INDEX_HASH_MISMATCH', `bundle-index.json hash mismatch for ${f.path}`);
                     }
                });

                const indexPaths = new Set(indexJson.files.map(f => f.path));

                // Check if SHA256SUMS contains files not in index
                const missingInIndex = [];
                for(const file of canonicalHashes.keys()) {
                     if (!indexPaths.has(file)) {
                         missingInIndex.push(file);
                     }
                }

                if (missingInIndex.length > 0) {
                      missingInIndex.forEach(f => {
                          addError('INDEX_MISSING_FILE', `SHA256SUMS lists file not in bundle-index.json: ${f}`);
                      });
                } else {
                     addCheck('bundle-index.json validated against SHA256SUMS');
                }
            }

            if (indexJson.pointers) {
                 // Check pointers
                 for(const [ptrName, ptrTarget] of Object.entries(indexJson.pointers)) {
                     if (!canonicalHashes.has(ptrTarget)) {
                         addError('POINTER_INVALID', `Pointer ${ptrName} -> ${ptrTarget} targets file not in SHA256SUMS`);
                     }
                 }
                 addCheck('bundle-index.json pointers validated');
            }

        } catch (e) {
            // Let ReleaseBundleError propagate to the main handler, otherwise wrap it.
            if (e instanceof ReleaseBundleError) {
                throw e;
            }
            addError('INTERNAL_ERROR', `Error processing bundle-index.json: ${e.message}`);
        }
    }

    // 4. Provenance Check
    const provPath = join(BUNDLE_DIR, 'provenance.json');
    if (existsSync(provPath)) {
        try {
             const provJson = JSON.parse(readFileSync(provPath, 'utf-8'));
             if (provJson.subject && Array.isArray(provJson.subject)) {
                 RESULTS.fileCounts.subjectCount = provJson.subject.length;
                 const subjectPaths = new Set();
                 provJson.subject.forEach(sub => {
                     subjectPaths.add(sub.name);
                     if (!canonicalHashes.has(sub.name)) {
                         addError('PROV_EXTRA_SUBJECT', `Provenance subject not in SHA256SUMS: ${sub.name}`);
                     } else {
                         // Check digests
                         // Provenance usually has "digest": { "sha256": "..." }
                         if (sub.digest && sub.digest.sha256) {
                             if (sub.name !== 'provenance.json' && sub.digest.sha256 !== canonicalHashes.get(sub.name)) {
                                 // Skip hash check for self
                                 addError('PROV_HASH_MISMATCH', `Provenance hash mismatch for ${sub.name}`);
                             }
                         }
                     }
                 });

                 // Ensure no missing subjects
                 const missingSubjects = [];
                 for(const file of canonicalHashes.keys()) {
                     if (!subjectPaths.has(file) && file !== 'provenance.json' && file !== 'bundle-index.json') {
                         missingSubjects.push(file);
                     }
                 }

                 if (missingSubjects.length > 0) {
                     missingSubjects.forEach(f => {
                         addError('PROV_MISSING_SUBJECT', `SHA256SUMS file missing from Provenance subjects: ${f}`);
                     });
                 } else {
                     addCheck('provenance.json subjects match SHA256SUMS');
                 }
             }
        } catch (e) {
             throw new ReleaseBundleError('INVALID_JSON', `Failed to parse provenance.json: ${e.message}`);
        }
    }

    // 5. Notes Source Check
    const notesSourcePath = join(BUNDLE_DIR, 'notes-source.json');
    if (existsSync(notesSourcePath)) {
        if (!existsSync(join(BUNDLE_DIR, 'release-notes.md'))) {
            addError('NOTES_MISSING', 'notes-source.json exists but release-notes.md is missing');
        } else {
            addCheck('notes-source.json consistency verified');
        }
    }

} catch (e) {
    if (e instanceof ReleaseBundleError) {
        addError(e.code, e.message);
    } else {
        addError('INTERNAL_ERROR', e.message);
    }
}

RESULTS.ok = RESULTS.errors.length === 0;

// Write report
const reportPath = join(BUNDLE_DIR, 'verify.json');
writeFileSync(reportPath, JSON.stringify(RESULTS, null, 2));
console.log(`\n📄 Report written to ${reportPath}`);

if (RESULTS.ok) {
    console.log(`\n✨ Verify: PASS (cross-check: checksums/index/provenance)`);
    process.exit(0);
} else {
    console.error(`\n❌ Verify: FAIL`);
    RESULTS.errors.forEach(e => console.error(` - [${e.code}] ${e.message}`));
    process.exit(1);
}
