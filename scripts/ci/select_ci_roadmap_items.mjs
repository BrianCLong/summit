#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// --- Paths & Constants ---
const ARTIFACTS_DIR = 'artifacts';
const TRENDS_REPORT = path.join(ARTIFACTS_DIR, 'ci-trends/report.json');
const OKR_STATUS = path.join(ARTIFACTS_DIR, 'ci-okrs/status.json');
const FAILURE_TAXONOMY = 'docs/ci/FAILURE_TAXONOMY.yml';
const POLICY_FILE = 'policy/ci-roadmap.yml';
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'ci-roadmap/selected.json');

// --- Helpers ---

function safeReadJson(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Warning: Failed to read ${filepath}: ${e.message}`);
    return null;
  }
}

function safeReadYaml(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    return yaml.load(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Warning: Failed to read ${filepath}: ${e.message}`);
    return null;
  }
}

// --- Logic ---

async function main() {
  console.log("Starting CI Roadmap Selection...");

  // 1. Load Inputs
  const trends = safeReadJson(TRENDS_REPORT);
  const okrs = safeReadJson(OKR_STATUS);
  const taxonomy = safeReadYaml(FAILURE_TAXONOMY) || { categories: {} };
  const policyConfig = safeReadYaml(POLICY_FILE);

  const policy = policyConfig ? policyConfig.ci_roadmap_sync : null;

  if (!policy || !policy.enabled) {
    console.log("Policy is disabled or missing. Exiting.");
    return;
  }

  const selectionConfig = policy.selection;
  const candidates = [];

  // 2. Process OKRs
  if (selectionConfig.include_failed_okrs && okrs && okrs.okrs) {
    for (const okr of okrs.okrs) {
      if (okr.status === 'fail' || okr.status === 'risk') {
        candidates.push({
          id: `OKR-${okr.id}`,
          type: 'okr_remediation',
          source_id: okr.id,
          title: `Remediate CI OKR: ${okr.name}`,
          description: `OKR ${okr.id} is in ${okr.status} state. Current value: ${okr.value}, Target: ${okr.target}.`,
          score: 1000, // High priority
          failure_code: null,
          evidence: okr.evidence_url || null
        });
      }
    }
  }

  // 3. Process Trends (Failures)
  if (trends && trends.failures) {
    for (const failure of trends.failures) {
        const category = taxonomy.categories[failure.code] || { severity: 'info' };

        // Skip if count or regression doesn't meet thresholds
        const count = failure.count || 0;
        const delta = failure.regression_delta || 0;

        if (count < selectionConfig.min_failure_count && delta < selectionConfig.min_regression_delta) {
            continue;
        }

        let score = 0;

        // Scoring Logic
        if (category.severity === 'fail') score += 500;
        else if (category.severity === 'warn') score += 200;
        else score += 50;

        score += (delta * 10); // Weight regression higher
        score += (count * 1);  // Weight volume

        candidates.push({
            id: `FAIL-${failure.code}`,
            type: 'failure_remediation',
            source_id: failure.code,
            title: `Fix Top Failure: ${failure.code}`,
            description: `Failure code ${failure.code} occurred ${count} times (regression: ${delta > 0 ? '+' : ''}${delta}). Category: ${category.description || 'Unknown'}`,
            score: score,
            failure_code: failure.code,
            evidence: failure.example_url || null
        });
    }
  }

  // 4. Sort and Select
  candidates.sort((a, b) => b.score - a.score);

  const selected = candidates.slice(0, policy.max_items_per_week);

  // 5. Output
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    generated_at: new Date().toISOString(),
    policy_snapshot: policy,
    items: selected
  }, null, 2));

  console.log(`Selected ${selected.length} items. Output written to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
