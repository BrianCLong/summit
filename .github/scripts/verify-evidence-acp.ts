#!/usr/bin/env tsx
/**
 * verify-evidence-acp.ts — CI script that validates the agent control plane
 * evidence bundle for the agent-fleet-control-plane-2027 item.
 *
 * Exit 0 = all checks pass.
 * Exit 1 = one or more violations found.
 *
 * EVD-AFCP-ARCH-001
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const EVIDENCE_DIR = path.join(repoRoot, "evidence", "agent-fleet-control-plane-2027");

// ─── Required evidence files ──────────────────────────────────────────────────

const REQUIRED_FILES = ["index.json", "report.json", "metrics.json", "stamp.json"];

let failures = 0;

for (const file of REQUIRED_FILES) {
  const abs = path.join(EVIDENCE_DIR, file);
  if (!fs.existsSync(abs)) {
    console.error(`[FAIL] Missing evidence file: evidence/agent-fleet-control-plane-2027/${file}`);
    failures++;
    continue;
  }

  try {
    const content = JSON.parse(fs.readFileSync(abs, "utf-8"));

    if (!content.item_slug) {
      console.error(`[FAIL] ${file} missing 'item_slug' field.`);
      failures++;
    } else {
      console.log(`[OK]   ${file} — item_slug: ${content.item_slug}`);
    }
  } catch {
    console.error(`[FAIL] ${file} is not valid JSON.`);
    failures++;
  }
}

// ─── Validate index.json evidence array ──────────────────────────────────────

const indexPath = path.join(EVIDENCE_DIR, "index.json");
if (fs.existsSync(indexPath)) {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));

  if (!Array.isArray(index.evidence) || index.evidence.length === 0) {
    console.error(`[FAIL] index.json 'evidence' array is missing or empty.`);
    failures++;
  } else {
    for (const entry of index.evidence) {
      if (!entry.id || !Array.isArray(entry.files)) {
        console.error(`[FAIL] index.json evidence entry malformed: ${JSON.stringify(entry)}`);
        failures++;
      }
    }
    console.log(`[OK]   index.json contains ${index.evidence.length} evidence entries.`);
  }
}

// ─── Validate stamp.json ─────────────────────────────────────────────────────

const stampPath = path.join(EVIDENCE_DIR, "stamp.json");
if (fs.existsSync(stampPath)) {
  const stamp = JSON.parse(fs.readFileSync(stampPath, "utf-8"));

  if (!stamp.generated_at) {
    console.error(`[FAIL] stamp.json missing 'generated_at' field.`);
    failures++;
  } else {
    console.log(`[OK]   stamp.json generated_at: ${stamp.generated_at}`);
  }
}

// ─── Final result ─────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`\n[FAIL] evidence-schema-check: ${failures} failure(s) found.`);
  process.exit(1);
}

console.log(`\n[PASS] evidence-schema-check complete.`);
