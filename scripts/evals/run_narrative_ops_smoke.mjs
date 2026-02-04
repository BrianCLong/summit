#!/usr/bin/env node
/**
 * run_narrative_ops_smoke.mjs
 * Deterministic eval smoke harness.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const ROOT = process.cwd();
const ITEM_SLUG = "narrative-ops-detection-2026-01-28";
const EVENTS_FILE = "evals/narrative_ops/smoke/events.jsonl";

async function main() {
  if (!fs.existsSync(EVENTS_FILE)) { console.error("Missing events file"); process.exit(1); }

  const fileStream = fs.createReadStream(EVENTS_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  const domains = new Set();

  for await (const line of rl) {
      if (!line.trim()) continue;
      try {
          const evt = JSON.parse(line);
          count++;
          if (evt.domain) domains.add(evt.domain);
      } catch (e) {
          console.error("JSON parse error", e);
      }
  }

  // Toy coordination score: ratio of events to domains (higher means more density per domain? or other way around)
  // Let's just use count / unique_domains
  const score = domains.size > 0 ? (count / domains.size) : 0;

  // Deterministic outputs
  const report = {
      evidence_id: "EVD-NAROPS-EVAL-001",
      item_slug: ITEM_SLUG,
      generated_by: "scripts/evals/run_narrative_ops_smoke.mjs",
      claims: [
          { claim_id: "ITEM:CLAIM-01", backing: "ITEM:CLAIM-01" }
      ],
      decisions: ["Eval smoke run completed."],
      notes: [`processed ${count} events`]
  };

  const metrics = {
      evidence_id: "EVD-NAROPS-EVAL-001",
      item_slug: ITEM_SLUG,
      metrics: {
          events_count: count,
          unique_domains: domains.size,
          toy_coordination_score: Number(score.toFixed(4))
      }
  };

  const stamp = {
      evidence_id: "EVD-NAROPS-EVAL-001",
      item_slug: ITEM_SLUG,
      tool_versions: { node: process.version },
      timestamp: new Date().toISOString()
  };

  const outDir = path.join(ROOT, "subsumption", ITEM_SLUG, "runs", "ci", "EVD-NAROPS-EVAL-001");
  fs.mkdirSync(outDir, { recursive: true });

  const stableJSONStringify = (obj) => {
    const allKeys = [];
    JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
    allKeys.sort();
    return JSON.stringify(obj, allKeys, 2) + "\n";
  };

  fs.writeFileSync(path.join(outDir, "report.json"), stableJSONStringify(report));
  fs.writeFileSync(path.join(outDir, "metrics.json"), stableJSONStringify(metrics));
  fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");

  console.log("EVAL SMOKE OK");
}

main();
