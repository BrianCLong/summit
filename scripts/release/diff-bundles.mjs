#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

const IGNORED_JSON_FIELDS = [
  'generatedAt',
  'at',
  'timestamp',
  'created',
  'date',
  'runId',
  'buildUrl',
  'jobUrl',
  'sha',
  'gitSha',
];

const JSON_FILES_TO_DIFF = [
  'release-status.json',
  'release-manifest.json',
  'release-summary.json',
  'provenance.json',
  'bundle-index.json',
  'preflight.json',
  'freeze.json',
  'verify.json',
];

async function main() {
  const options = {
    a: { type: 'string' },
    b: { type: 'string' },
    json: { type: 'boolean' },
  };

  // Handle double-dash passed by npm/pnpm
  let args = process.argv.slice(2);
  if (args[0] === '--') {
    args = args.slice(1);
  }

  const { values } = parseArgs({ args, options, strict: false });

  if (!values.a || !values.b) {
    console.error('Usage: node diff-bundles.mjs --a <path> --b <path> [--json]');
    process.exit(1);
  }

  const dirA = path.resolve(values.a);
  const dirB = path.resolve(values.b);

  if (!fs.existsSync(dirA)) {
    console.error(`Error: Directory A not found: ${dirA}`);
    process.exit(1);
  }
  if (!fs.existsSync(dirB)) {
    console.error(`Error: Directory B not found: ${dirB}`);
    process.exit(1);
  }

  const result = await compareBundles(dirA, dirB);

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }
}

async function compareBundles(dirA, dirB) {
  const filesA = getFiles(dirA);
  const filesB = getFiles(dirB);

  const fileSetA = new Set(filesA);
  const fileSetB = new Set(filesB);

  const added = filesB.filter(f => !fileSetA.has(f));
  const removed = filesA.filter(f => !fileSetB.has(f));
  const common = filesA.filter(f => fileSetB.has(f));

  const changed = [];
  const jsonDiffs = {};
  const schemaWarnings = [];

  const checksumsA = await loadChecksums(dirA, filesA);
  const checksumsB = await loadChecksums(dirB, filesB);

  for (const file of common) {
    const hashA = checksumsA[file] || await computeHash(path.join(dirA, file));
    const hashB = checksumsB[file] || await computeHash(path.join(dirB, file));

    if (hashA !== hashB) {
      changed.push(file);

      if (JSON_FILES_TO_DIFF.includes(file)) {
        const diff = await diffJsonFile(path.join(dirA, file), path.join(dirB, file));
        if (diff && Object.keys(diff.changes).length > 0) {
          jsonDiffs[file] = diff.changes;
        }
        if (diff && diff.schemaMismatch) {
            schemaWarnings.push({ file, ...diff.schemaMismatch });
        }
      }
    }
  }

  return {
    dirs: { a: dirA, b: dirB },
    files: {
      added,
      removed,
      changed,
    },
    jsonDiffs,
    schemaWarnings,
  };
}

function getFiles(dir) {
    // Non-recursive as per default spec
    try {
        return fs.readdirSync(dir).filter(f => {
            const stat = fs.statSync(path.join(dir, f));
            return stat.isFile();
        });
    } catch (e) {
        console.error(`Error reading directory ${dir}: ${e.message}`);
        return [];
    }
}

async function loadChecksums(dir, files) {
  const checksums = {};
  const sumsPath = path.join(dir, 'SHA256SUMS');

  if (fs.existsSync(sumsPath)) {
    try {
      const content = fs.readFileSync(sumsPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const hash = parts[0];
            // The file path in SHA256SUMS might be relative or have ./ prefix
            let filepath = parts.slice(1).join(' ');
            if (filepath.startsWith('./')) {
                filepath = filepath.substring(2);
            }
            // Only care if it's in our top-level file list
            if (files.includes(filepath)) {
                checksums[filepath] = hash;
            }
        }
      }
    } catch (e) {
        // Ignore read errors, fallback to compute
    }
  }
  return checksums;
}

async function computeHash(filepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filepath);
    stream.on('error', err => resolve('ERROR')); // Resolve error to distinct string
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function diffJsonFile(pathA, pathB) {
    let objA, objB;
    try {
        objA = JSON.parse(fs.readFileSync(pathA, 'utf8'));
        objB = JSON.parse(fs.readFileSync(pathB, 'utf8'));
    } catch (e) {
        return null; // Cannot parse JSON
    }

    const changes = {};
    compareObjects(objA, objB, '', changes);

    let schemaMismatch = null;
    if (objA.schemaVersion !== objB.schemaVersion) {
        schemaMismatch = {
            a: objA.schemaVersion,
            b: objB.schemaVersion,
        };
    }

    return { changes, schemaMismatch };
}

function compareObjects(a, b, prefix, changes) {
    if (a === b) return;

    // Helper to check if value is primitive
    const isPrimitive = (val) => val === null || typeof val !== 'object';

    if (isPrimitive(a) || isPrimitive(b)) {
        if (a !== b) {
            changes[prefix] = { from: a, to: b };
        }
        return;
    }

    // Both are objects/arrays
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of keys) {
        if (IGNORED_JSON_FIELDS.includes(key)) continue;

        const valA = a[key];
        const valB = b[key];
        const currentPath = prefix ? `${prefix}.${key}` : key;

        if (valA === undefined) {
            changes[currentPath] = { from: undefined, to: valB }; // Added
        } else if (valB === undefined) {
            changes[currentPath] = { from: valA, to: undefined }; // Removed
        } else {
            compareObjects(valA, valB, currentPath, changes);
        }
    }
}

function printReport(result) {
  console.log(`\n📦 Bundle Diff Report`);
  console.log(`======================`);
  console.log(`A: ${result.dirs.a}`);
  console.log(`B: ${result.dirs.b}`);
  console.log(`----------------------`);

  console.log(`\n📂 File Deltas:`);
  if (result.files.added.length === 0 && result.files.removed.length === 0 && result.files.changed.length === 0) {
      console.log(`  (No file differences)`);
  } else {
      if (result.files.added.length > 0) console.log(`  [+] Added: ${result.files.added.join(', ')}`);
      if (result.files.removed.length > 0) console.log(`  [-] Removed: ${result.files.removed.join(', ')}`);
      if (result.files.changed.length > 0) console.log(`  [~] Changed: ${result.files.changed.join(', ')}`);
  }

  const jsonFilesWithDiffs = Object.keys(result.jsonDiffs);
  if (jsonFilesWithDiffs.length > 0) {
      console.log(`\n📝 Key JSON Changes:`);
      for (const file of jsonFilesWithDiffs) {
          console.log(`  > ${file}:`);
          const diffs = result.jsonDiffs[file];
          for (const [path, change] of Object.entries(diffs)) {
              console.log(`    - ${path}: ${formatValue(change.from)} -> ${formatValue(change.to)}`);
          }
      }
  }

  if (result.schemaWarnings.length > 0) {
      console.log(`\n⚠️  Compatibility Warnings:`);
      for (const warning of result.schemaWarnings) {
          console.log(`  ! ${warning.file}: schemaVersion changed from "${warning.a}" to "${warning.b}". Possible incompatible bundle consumers.`);
      }
  }
  console.log(`\n----------------------`);
}

function formatValue(val) {
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
}

main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
