import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../db/migrations/postgres');
const MANIFEST_PATH = path.join(MIGRATIONS_DIR, 'manifest.json');

interface Manifest {
  [filename: string]: string; // filename -> sha256 hash
}

interface AuditResult {
  file: string;
  errors: string[];
  warnings: string[];
}

const DESTRUCTIVE_REGEX = [
  { pattern: /\bDROP\s+(TABLE|COLUMN|DATABASE|SCHEMA|VIEW|INDEX)\b/i, message: 'Destructive DROP detected' },
  { pattern: /\bTRUNCATE\b/i, message: 'Destructive TRUNCATE detected' },
  { pattern: /\bDELETE\s+FROM\b/i, message: 'Destructive DELETE detected' },
  { pattern: /\bALTER\s+TABLE\s+.*\s+DROP\s+/i, message: 'Destructive ALTER DROP detected' },
];

const CONTRACT_REGEX = [
  { pattern: /\bALTER\s+TABLE\s+.*\s+RENAME\s+/i, message: 'RENAME COLUMN detected. This breaks existing code. Use Expand/Contract pattern.' },
];

function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function scanFile(filepath: string, content: string): AuditResult {
  const filename = path.basename(filepath);
  const result: AuditResult = { file: filename, errors: [], warnings: [] };
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // 1. Skip if line is a comment or empty
    if (trimmed.startsWith('--') || trimmed.length === 0) return;

    // 2. Remove inline comments (e.g. "DROP TABLE x; -- comment") for checking
    // Simple naive check: split by '--' and take the first part
    // This isn't perfect for strings containing '--', but good enough for SQL keywords outside strings
    const codePart = line.split('--')[0];

    // 3. Check for suppression (still allow suppression on previous line or same line in original content)
    // We check original 'line' for suppression tag
    if (line.includes('-- AUDIT: ALLOW DESTRUCTIVE')) return;
    if (line.includes('-- AUDIT: ALLOW CONTRACT')) return;

    // Look for suppression on previous line
    const prevLine = index > 0 ? lines[index - 1] : '';
    if (prevLine.includes('-- AUDIT: ALLOW DESTRUCTIVE') || prevLine.includes('-- AUDIT: ALLOW CONTRACT')) return;

    // Check Destructive on the code part
    for (const rule of DESTRUCTIVE_REGEX) {
      if (rule.pattern.test(codePart)) {
        result.errors.push(`Line ${index + 1}: ${rule.message}. Use '-- AUDIT: ALLOW DESTRUCTIVE' to suppress.`);
      }
    }

    // Check Contract on the code part
    for (const rule of CONTRACT_REGEX) {
      if (rule.pattern.test(codePart)) {
        result.errors.push(`Line ${index + 1}: ${rule.message}. Use '-- AUDIT: ALLOW CONTRACT' to suppress.`);
      }
    }
  });

  return result;
}

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse manifest.json');
    return {};
  }
}

function saveManifest(manifest: Manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest at ${MANIFEST_PATH}`);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--update-manifest') ? 'update' : 'check';
  // const strict = args.includes('--strict');

  console.log(`Starting Migration Audit in ${mode.toUpperCase()} mode...`);
  console.log(`Directory: ${MIGRATIONS_DIR}`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  const manifest = loadManifest();
  const newManifest: Manifest = { ...manifest };
  let hasError = false;

  // Track which files we've seen to detect deletions (optional, but good)
  const seenFiles = new Set<string>();

  for (const file of files) {
    seenFiles.add(file);
    const filepath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const hash = calculateHash(content);

    // 1. Integrity Check (Drift)
    if (manifest[file]) {
      if (manifest[file] !== hash) {
        console.error(`❌ INTEGRITY ERROR: File ${file} has been modified!`);
        console.error(`   Expected: ${manifest[file]}`);
        console.error(`   Actual:   ${hash}`);
        console.error(`   Modification of existing migrations is PROHIBITED.`);
        hasError = true;
      }
    } else {
      // New file
      if (mode === 'check') {
        console.error(`❌ MANIFEST ERROR: New migration file detected but not tracked: ${file}`);
        console.error(`   Run with --update-manifest to acknowledge this file.`);
        hasError = true;
      } else {
        console.log(`ℹ️  New migration file detected: ${file}`);
        newManifest[file] = hash;
      }
    }

    // 2. Content Scan (Destructive/Contract)
    const audit = scanFile(filepath, content);
    if (audit.errors.length > 0) {
      console.error(`❌ RULE VIOLATION: ${file}`);
      audit.errors.forEach(e => console.error(`   ${e}`));
      hasError = true;
    }
    if (audit.warnings.length > 0) {
      console.warn(`⚠️  WARNING: ${file}`);
      audit.warnings.forEach(w => console.warn(`   ${w}`));
    }
  }

  // Check for deleted files?
  if (mode === 'check') {
      for (const file of Object.keys(manifest)) {
          if (!seenFiles.has(file)) {
             console.error(`❌ MANIFEST ERROR: Migration file missing: ${file}`);
             hasError = true;
          }
      }
  } else {
      // Clean up manifest
      for (const file of Object.keys(newManifest)) {
          if (!seenFiles.has(file)) {
             console.log(`ℹ️  Migration file removed from manifest: ${file}`);
             delete newManifest[file];
          }
      }
  }


  if (mode === 'update') {
    if (hasError) {
      console.error('❌ Cannot update manifest due to audit errors.');
      process.exit(1);
    }
    saveManifest(newManifest);
    console.log('✅ Manifest updated successfully.');
  } else {
    if (hasError) {
      console.error('❌ Audit FAILED.');
      process.exit(1);
    }
    console.log('✅ Audit PASSED.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
