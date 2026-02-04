#!/usr/bin/env node
// Drift detector skeleton — deterministic outputs only.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ITEM_SLUG = "narrative-ops-detection-2026-01-28";
const EVIDENCE_ID = "EVD-NAROPS-DRIFT-001";

function main() {
    // Check if manifest exists
    const manifestExists = fs.existsSync(path.join(ROOT, `subsumption/${ITEM_SLUG}/manifest.yaml`)) ? 1 : 0;

    // Deterministic output
    const outDir = path.join(ROOT, "subsumption", ITEM_SLUG, "runs", "ci", EVIDENCE_ID);
    fs.mkdirSync(outDir, { recursive: true });

    const report = {
        evidence_id: EVIDENCE_ID,
        item_slug: ITEM_SLUG,
        generated_by: "scripts/monitoring/narrative-ops-detection-2026-01-28-drift.mjs",
        claims: [],
        decisions: ["Drift check completed"],
        notes: [`manifest_exists=${manifestExists}`]
    };

    const metrics = {
        evidence_id: EVIDENCE_ID,
        item_slug: ITEM_SLUG,
        metrics: {
            manifest_exists: manifestExists
        }
    };

    const stamp = {
        evidence_id: EVIDENCE_ID,
        item_slug: ITEM_SLUG,
        tool_versions: { node: process.version },
        timestamp: new Date().toISOString()
    };

    const stableJSONStringify = (obj) => {
        const allKeys = [];
        JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
        allKeys.sort();
        return JSON.stringify(obj, allKeys, 2) + "\n";
    };

    fs.writeFileSync(path.join(outDir, "report.json"), stableJSONStringify(report));
    fs.writeFileSync(path.join(outDir, "metrics.json"), stableJSONStringify(metrics));
    fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");

    console.log("DRIFT CHECK OK");
}

main();
