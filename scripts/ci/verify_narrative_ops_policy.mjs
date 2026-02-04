#!/usr/bin/env node
/**
 * verify_narrative_ops_policy.mjs
 * Validates deny-by-default policy fixtures.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ITEM_SLUG = "narrative-ops-detection-2026-01-28";
const POLICY_FILE = "policies/narrative_ops/policy.yaml";
const NEG_FIXTURE = "tests/policy/narrative_ops.negative.json";
const POS_FIXTURE = "tests/policy/narrative_ops.positive.json";

function loadYAML(yamlText) {
  // Minimal YAML parser (same as in bundle verifier)
  const getList = (key, text) => {
    const re = new RegExp(`^\\s*${key}:\\s*\\n((?:\\s*-\\s.*\\n)*)`, "m");
    const m = text.match(re);
    if (!m) return [];
    return m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).replace(/"/g, "").trim());
  };

  // Extract rules
  const rules = [];
  const ruleBlocks = yamlText.split("- id: ").slice(1);
  for (const block of ruleBlocks) {
      const id = block.split("\n")[0].trim();
      const deny_phrases = getList("deny_phrases", block);
      const require_phrases = getList("require_phrases", block);
      rules.push({ id, deny_phrases, require_phrases });
  }
  return { rules };
}

function checkPolicy(text, policy) {
  const violations = [];
  for (const rule of policy.rules) {
    if (rule.deny_phrases) {
      for (const phrase of rule.deny_phrases) {
        if (text.includes(phrase)) {
          violations.push(`Rule ${rule.id} failed: found denied phrase '${phrase}'`);
        }
      }
    }
    if (rule.require_phrases) {
      let found = false;
      for (const phrase of rule.require_phrases) {
        if (text.includes(phrase)) {
            found = true;
            break;
        }
      }
      if (!found && rule.require_phrases.length > 0) {
           // Wait, require_phrases logic: usually "must contain at least one of".
           // The fixture "This pattern appears coordinated" has one.
           violations.push(`Rule ${rule.id} failed: missing required phrases`);
      }
    }
  }
  return violations;
}

function stableJSONStringify(obj) {
  const allKeys = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys, 2) + "\n";
}

function writeEvidence(evidenceId, reportObj, metricsObj, stampObj) {
  const outDir = path.join(
    ROOT,
    "subsumption",
    ITEM_SLUG,
    "runs",
    "ci",
    evidenceId
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "report.json"), stableJSONStringify(reportObj));
  fs.writeFileSync(path.join(outDir, "metrics.json"), stableJSONStringify(metricsObj));
  fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stampObj, null, 2) + "\n");
}

function main() {
  if (!fs.existsSync(POLICY_FILE)) { console.error("Missing policy"); process.exit(1); }
  const policyText = fs.readFileSync(POLICY_FILE, "utf8");
  const policy = loadYAML(policyText);

  const negData = JSON.parse(fs.readFileSync(NEG_FIXTURE, "utf8"));
  const posData = JSON.parse(fs.readFileSync(POS_FIXTURE, "utf8"));

  // Check Negative Fixture (should fail)
  let negFailures = 0;
  for (const claim of negData.claims) {
    const v = checkPolicy(claim.text, policy);
    if (v.length > 0) negFailures++;
  }

  // Check Positive Fixture (should pass)
  let posFailures = 0;
  for (const claim of posData.claims) {
    const v = checkPolicy(claim.text, policy);
    if (v.length > 0) posFailures++;
  }

  const success = (negFailures > 0) && (posFailures === 0);

  if (!success) {
      console.error(`POLICY CHECK FAILED: Negative Caught=${negFailures}, Positive Failures=${posFailures}`);
      process.exitCode = 1;
  } else {
      console.log("POLICY CHECK PASSED");
  }

  writeEvidence(
    "EVD-NAROPS-POLICY-001",
    {
      evidence_id: "EVD-NAROPS-POLICY-001",
      item_slug: ITEM_SLUG,
      generated_by: "scripts/ci/verify_narrative_ops_policy.mjs",
      claims: [],
      decisions: [
        success ? "Policy fixtures behavior verified." : "Policy fixtures verification failed."
      ],
      notes: [`neg_caught=${negFailures}`, `pos_failures=${posFailures}`]
    },
    {
      evidence_id: "EVD-NAROPS-POLICY-001",
      item_slug: ITEM_SLUG,
      metrics: {
        negative_fixture_catch_rate: negFailures > 0 ? 1 : 0,
        positive_fixture_pass_rate: posFailures === 0 ? 1 : 0
      }
    },
    {
      evidence_id: "EVD-NAROPS-POLICY-001",
      item_slug: ITEM_SLUG,
      tool_versions: { node: process.version },
      timestamp: new Date().toISOString()
    }
  );
}

main();
