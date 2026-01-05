#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// --- Configuration & Arguments ---
const options = {
  mode: { type: 'string', default: 'none' },
  dir: { type: 'string', default: 'dist/release' },
};

const { values } = parseArgs({ options, strict: false });

if (values.mode === 'none') {
  console.log('Redaction mode is "none". Skipping.');
  process.exit(0);
}

if (values.mode !== 'safe-share') {
  console.error(`❌ Unknown redaction mode: ${values.mode}. Supported: safe-share, none`);
  process.exit(1);
}

const BUNDLE_DIR = resolve(values.dir);

if (!existsSync(BUNDLE_DIR)) {
  console.error(`❌ Bundle directory not found: ${BUNDLE_DIR}`);
  process.exit(1);
}

console.log(`🔒 Applying redaction (${values.mode}) to ${BUNDLE_DIR}...`);

// --- Redaction Logic ---

const SENSITIVE_KEYS = [
  'run.url', 'run.id', 'workflow', 'runAttempt',
  'repoUrl', 'GITHUB_REPOSITORY',
  'actor', 'sender', 'pusher', 'committer' // broad stroke on usernames
];

// Recursive redaction function
function redact(obj, path = '') {
  if (Array.isArray(obj)) {
    return obj.map((item, i) => redact(item, `${path}[${i}]`));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check keys
      const fullPath = path ? `${path}.${key}` : key;

      // Heuristic check on key names
      const isSensitiveKey = SENSITIVE_KEYS.some(k => {
          if (k.includes('.')) {
              return fullPath.endsWith(k) || fullPath === k;
          }
          return key === k;
      });

      if (isSensitiveKey) {
        newObj[key] = `<redacted:${key}>`;
      } else if (typeof value === 'string') {
        // Check values for sensitive patterns (URLs, etc)
        const lowerVal = value.toLowerCase();
        if (lowerVal.startsWith('http') && (lowerVal.includes('github.com') || lowerVal.includes('gitlab'))) {
             newObj[key] = '<redacted:url>';
        } else {
             newObj[key] = redact(value, fullPath);
        }
      } else {
        newObj[key] = redact(value, fullPath);
      }
    }
    return newObj;
  }
  return obj;
}

const FILES_TO_PROCESS = [
  'release-manifest.json',
  'release-status.json',
  'release-summary.json',
  'provenance.json',
  'preflight.json',
  'verify.json',
  // 'bundle-index.json' // Processed separately for hash updates
];

const redactedFiles = [];
const hashMap = new Map(); // OldHash -> NewHash

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// Process content files
for (const file of FILES_TO_PROCESS) {
  const filePath = join(BUNDLE_DIR, file);
  if (existsSync(filePath)) {
    try {
      const rawContent = readFileSync(filePath, 'utf-8');
      const originalHash = sha256(rawContent);

      const content = JSON.parse(rawContent);
      const redactedContent = redact(content);
      const newRawContent = JSON.stringify(redactedContent, null, 2);
      const newHash = sha256(newRawContent);

      if (originalHash !== newHash) {
          writeFileSync(filePath, newRawContent);
          redactedFiles.push(file);
          hashMap.set(originalHash, newHash);
          console.log(`   Redacted ${file}`);
      }
    } catch (e) {
      console.warn(`⚠️  Failed to process ${file}: ${e.message}`);
    }
  }
}

// Update bundle-index.json if it exists and contains old hashes
const bundleIndexPath = join(BUNDLE_DIR, 'bundle-index.json');
if (existsSync(bundleIndexPath)) {
    try {
        let content = readFileSync(bundleIndexPath, 'utf-8');
        let updated = false;

        // Brute-force replace old hashes with new hashes
        // This assumes hashes are stored as full sha256 hex strings
        for (const [oldHash, newHash] of hashMap.entries()) {
            if (content.includes(oldHash)) {
                content = content.replaceAll(oldHash, newHash);
                updated = true;
            }
        }

        // Also redact the index itself if it has sensitive data
        // But be careful not to break structure.
        // If we trust 'redact' not to break structure, we can do it.
        // But 'redact' changes values.
        // Let's first apply redaction to the object structure
        const json = JSON.parse(content);
        const redactedJson = redact(json);
        const finalContent = JSON.stringify(redactedJson, null, 2);

        if (updated || finalContent !== content) {
             writeFileSync(bundleIndexPath, finalContent);
             redactedFiles.push('bundle-index.json');
             console.log(`   Updated & Redacted bundle-index.json`);
        }
    } catch (e) {
        console.warn(`⚠️  Failed to update bundle-index.json: ${e.message}`);
    }
}

// Write redaction report
const report = {
  schemaVersion: "1.0.0",
  mode: values.mode,
  appliedAt: new Date().toISOString(),
  filesRedacted: redactedFiles
};
writeFileSync(join(BUNDLE_DIR, 'redaction.json'), JSON.stringify(report, null, 2));
console.log(`   Wrote redaction.json`);

// Regenerate Checksums
console.log('🔏 Regenerating Checksums...');
try {
     const getAllFiles = (dir) => {
         let results = [];
         const list = readdirSync(dir);
         list.forEach(file => {
             const filePath = join(dir, file);
             const stat = statSync(filePath);
             if (stat && stat.isDirectory()) {
                 results = results.concat(getAllFiles(filePath));
             } else {
                 results.push(filePath);
             }
         });
         return results;
     }

     const files = getAllFiles(BUNDLE_DIR).filter(f => !f.endsWith('checksums.txt') && !f.endsWith('SHA256SUMS'));
     let checksums = '';

     for (const file of files) {
         const relPath = relative(BUNDLE_DIR, file);
         try {
             // Use internal crypto for consistency
             const hash = sha256(readFileSync(file));
             checksums += `${hash}  ${relPath}\n`;
         } catch (e) {
             console.warn(`⚠️  Could not hash ${relPath}: ${e.message}`);
         }
     }

     // Write both checksums.txt (legacy) and SHA256SUMS (requested)
     writeFileSync(join(BUNDLE_DIR, 'checksums.txt'), checksums);
     writeFileSync(join(BUNDLE_DIR, 'SHA256SUMS'), checksums);
     console.log('   Updated checksums.txt & SHA256SUMS');
} catch (e) {
    console.error('❌ Failed to regenerate checksums:', e);
    process.exit(1);
}

// Update release-report.md if exists
const reportPath = join(BUNDLE_DIR, 'release-report.md');
if (existsSync(reportPath)) {
    const note = `\n\n> **Note:** This bundle has been redacted using mode \`${values.mode}\`. Sensitive fields have been masked.`;
    const content = readFileSync(reportPath, 'utf-8');
    if (!content.includes(note)) {
        writeFileSync(reportPath, content + note);
        console.log('   Updated release-report.md');
    }
}

console.log('✅ Redaction complete.');
