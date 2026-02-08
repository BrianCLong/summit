import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, "evidence");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function exists(p) {
  return fs.existsSync(p);
}

console.log("Verifying evidence...");

if (!exists(EVIDENCE_DIR)) fail(`Missing evidence/ directory`);

// 1. Verify root index.json
const indexFile = path.join(EVIDENCE_DIR, "index.json");
if (!exists(indexFile)) fail(`Missing root evidence/index.json`);

let indexData;
try {
    const content = fs.readFileSync(indexFile, 'utf8');
    indexData = JSON.parse(content);
    // Handle { items: [] } or []
    if (!Array.isArray(indexData) && indexData.items) {
        indexData = indexData.items;
    }
    if (!Array.isArray(indexData)) {
        fail(`evidence/index.json must be an array or object with items property`);
    }
} catch (e) {
    fail(`Invalid JSON in evidence/index.json: ${e.message}`);
}

let errors = 0;

// 2. Verify all files referenced in index.json exist
console.log(`Verifying ${indexData.length} entries in evidence/index.json...`);
for (const entry of indexData) {
    if (!entry.files) {
        console.error(`Entry ${entry.evidence_id} missing files property`);
        errors++;
        continue;
    }
    for (const [key, filepath] of Object.entries(entry.files)) {
        const absPath = path.join(ROOT, filepath);
        if (!exists(absPath)) {
            console.error(`Entry ${entry.evidence_id} missing file ${key}: ${filepath}`);
            errors++;
        }
    }
}

// 3. Strict verification for the NEW bundle only
const NEW_BUNDLE_DIR = "evidence/ai-platform-dev-2026-02-07";
const absNewBundleDir = path.join(ROOT, NEW_BUNDLE_DIR);

if (exists(absNewBundleDir)) {
    console.log(`Verifying new bundle: ${NEW_BUNDLE_DIR}`);
    for (const f of ["report.json", "metrics.json", "stamp.json", "index.json"]) {
        const fp = path.join(absNewBundleDir, f);
        if (!exists(fp)) {
            console.error(`  Missing ${f} in ${NEW_BUNDLE_DIR}`);
            errors++;
        }
    }
} else {
    console.warn(`New bundle directory ${NEW_BUNDLE_DIR} not found (might be expected if not created yet)`);
}

if (errors > 0) {
  fail(`Verification failed with ${errors} errors.`);
}

console.log("Evidence verification: OK");
