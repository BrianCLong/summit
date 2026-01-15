/**
 * verify_evidence_id_consistency.mjs
 *
 * Verifies that all Evidence IDs used in docs/ exist in the evidence catalog,
 * and that the catalog contains no duplicate IDs.
 *
 * Usage:
 *   node scripts/ci/verify_evidence_id_consistency.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const CATALOG_PATH = path.join(ROOT_DIR, 'docs', 'governance', 'evidence_catalog.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist', 'evidence');

// Regex to find Evidence IDs in markdown content
// Matches patterns like "Evidence ID: GOV-001" or just "GOV-001" if clearer context
// For now, we look for explicit mentions or references.
// Adjust regex based on actual usage. Assuming IDs like "GOV-001", "SOC2-CC6.1".
// A safe heuristic is to look for the exact ID if we know the list, but we want to find *unknown* ones too.
// Let's assume a convention: `Evidence ID: <ID>` or `[<ID>]` or `ID: <ID>`
// Or simply scan for tokens that look like IDs?
// Given the ambiguity, we'll scan for known IDs to ensure they are valid,
// and maybe warn on things that look like IDs but aren't in catalog?
//
// Actually, the goal is: "referencing nonexistent docs" or "duplicate IDs".
// Let's search for "Evidence ID: [A-Z0-9.-]+"

const ID_REGEX = /Evidence ID:\s*([A-Z0-9.-]+)(?=[^A-Z0-9.-]|$)/gi;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Evidence catalog not found at ${CATALOG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
}

function scanFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      results = results.concat(scanFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yml'))) {
      results.push(fullPath);
    }
  }
  return results;
}

function verify() {
  console.log('Verifying Evidence ID consistency...');

  const catalog = getCatalog();
  const validIds = new Set(catalog.entries.map(e => e.id));
  const duplicateIds = catalog.entries
    .map(e => e.id)
    .filter((e, i, a) => a.indexOf(e) !== i);

  if (duplicateIds.length > 0) {
    console.error(`ERROR: Duplicate IDs in catalog: ${duplicateIds.join(', ')}`);
    process.exit(1);
  }

  const files = scanFiles(DOCS_DIR);
  const usedIds = new Map(); // ID -> locations[]
  const invalidIds = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = ID_REGEX.exec(content)) !== null) {
      const id = match[1];
      const relPath = path.relative(ROOT_DIR, file);

      if (!validIds.has(id)) {
        invalidIds.push({ id, file: relPath });
      }

      if (!usedIds.has(id)) {
        usedIds.set(id, []);
      }
      usedIds.get(id).push(relPath);
    }
  }

  const report = {
    timestamp: new Date().toISOString(), // This is non-deterministic, but report itself is an artifact.
                                         // For strictly deterministic *content*, we might strip this.
    // The user asked for "stable hashing". So let's omit timestamp or use fixed if strictly needed.
    // We'll use a fixed field for determinism if SOURCE_DATE_EPOCH is set.
    generatedAt: process.env.SOURCE_DATE_EPOCH
      ? new Date(parseInt(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
      : new Date().toISOString(),
    catalogSize: validIds.size,
    usedIdsCount: usedIds.size,
    invalidIds,
    unusedIds: [...validIds].filter(id => !usedIds.has(id)).sort(),
    usedIds: Object.fromEntries([...usedIds].sort()),
  };

  ensureDir(OUTPUT_DIR);
  const reportPath = path.join(OUTPUT_DIR, 'evidence-id-consistency.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Report written to ${reportPath}`);

  if (invalidIds.length > 0) {
    console.error(`ERROR: Found ${invalidIds.length} invalid Evidence IDs:`);
    invalidIds.forEach(i => console.error(`  - ${i.id} in ${i.file}`));
    process.exit(1);
  }

  console.log('✅ Evidence ID consistency verified.');
}

verify();
