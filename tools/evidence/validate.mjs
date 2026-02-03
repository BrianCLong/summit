#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ROOT = process.cwd();
const OUT_DIR = process.env.EVIDENCE_OUT_DIR || path.join(ROOT, "evidence", "out");

// Initialize Ajv
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`[evidence] Failed to read/parse JSON at ${p}: ${e.message}`);
    return null;
  }
}

function loadSchema(rel) {
  const p = path.join(ROOT, "evidence", "schemas", rel);
  if (!fs.existsSync(p)) {
      console.error(`[evidence] Schema not found: ${p}`);
      process.exit(1);
  }
  return readJSON(p);
}

// Load schemas
const indexSchema = loadSchema("evidence.index.schema.json");
const validateIndex = ajv.compile(indexSchema);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.isFile() && ent.name === "index.json") acc.push(p);
  }
  return acc;
}

console.log(`[evidence] Scanning for evidence bundles in: ${OUT_DIR}`);
const indexes = walk(OUT_DIR);
if (indexes.length === 0) {
  console.error(`[evidence] No evidence/index.json found under ${OUT_DIR}`);
  process.exit(1);
}

const EVID_RE = /^EVD-[A-Z0-9-]+-[A-Z]+-[0-9]{3}$/;
let failed = false;

for (const idxPath of indexes) {
  const dirPath = path.dirname(idxPath);
  console.log(`[evidence] Validating bundle: ${dirPath}`);

  const idx = readJSON(idxPath);
  if (!idx) {
      failed = true;
      continue;
  }

  if (!validateIndex(idx)) {
    console.error(`[evidence] Invalid index: ${idxPath}`);
    console.error(validateIndex.errors);
    failed = true;
    continue;
  }

  // Validate contents
  for (const [evdId, rec] of Object.entries(idx.evidence)) {
    if (!EVID_RE.test(evdId)) {
      console.error(`[evidence] Bad Evidence ID ${evdId} in ${idxPath}. Must match ${EVID_RE}`);
      failed = true;
    }

    if (rec.files) {
        for (const rel of rec.files) {
          const filePath = path.resolve(dirPath, rel);
          if (!fs.existsSync(filePath)) {
            console.error(`[evidence] Missing file ${rel} referenced by ${evdId} in ${idxPath}`);
            failed = true;
          }

          // Timestamp check (best effort)
          if (rel !== "stamp.json") {
             if (rel.endsWith(".json")) {
                 const content = readJSON(filePath);
                 if (content && content.generated_at) {
                     console.error(`[evidence] File ${rel} contains 'generated_at'. Only stamp.json should have timestamps.`);
                     failed = true;
                 }
             }
          }
        }
    }
  }
}

if (failed) {
    console.error(`[evidence] Validation FAILED.`);
    process.exit(1);
} else {
    console.log(`[evidence] Validation PASSED.`);
    process.exit(0);
}
