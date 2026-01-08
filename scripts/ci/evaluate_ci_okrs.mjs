import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Constants
const OKR_FILE = 'docs/ci/CI_OKRS.yml';
const TRENDS_FILE = 'artifacts/ci-trends/report.json';
const BUDGET_FILE = 'artifacts/perf-budget/report.json';
const OUTPUT_MD = 'artifacts/ci-okrs/status.md';
const OUTPUT_JSON = 'artifacts/ci-okrs/status.json';

// Helper to read JSON safely
function readJson(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`Warning: File not found: ${filepath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error parsing JSON from ${filepath}: ${e.message}`);
    return null;
  }
}

// Helper to resolve metric value
function resolveMetric(okr, trends, budget) {
  const sourceName = okr.source;
  const metricName = okr.metric;
  let sourceData = null;

  if (sourceName === 'ci_failure_trends') {
    sourceData = trends;
  } else if (sourceName === 'perf_budget') {
    sourceData = budget;
  }

  if (!sourceData) {
    return { value: null, error: `Source '${sourceName}' unavailable` };
  }

  // Handle nested metrics if necessary
  if (sourceData[metricName] !== undefined) {
    return { value: sourceData[metricName], error: null };
  }

  // Try looking deeper if it's a known perf metric structure
  if (metricName === 'ga_verify_minutes_p95' && sourceData.metrics && sourceData.metrics.ga_verify_duration) {
     return { value: sourceData.metrics.ga_verify_duration.p95 || sourceData.metrics.ga_verify_duration.median, error: null };
  }

  return { value: null, error: `Metric '${metricName}' not found in source '${sourceName}'` };
}

// Main evaluation logic
async function main() {
  console.log('Starting CI OKR Evaluation...');

  // 1. Load OKR Catalog
  if (!fs.existsSync(OKR_FILE)) {
    console.error(`Error: OKR catalog not found at ${OKR_FILE}`);
    process.exit(1);
  }
  const okrCatalog = yaml.load(fs.readFileSync(OKR_FILE, 'utf8'));
  const okrs = okrCatalog.okrs;
  const windowDays = okrCatalog.window_days;

  // 2. Load Data Sources
  const trendsReport = readJson(TRENDS_FILE);
  const budgetReport = readJson(BUDGET_FILE);

  const results = [];
  let onTrackCount = 0;
  let atRiskCount = 0;

  // 3. Evaluate each OKR
  for (const okr of okrs) {
    const { value, error } = resolveMetric(okr, trendsReport, budgetReport);

    let status = 'unknown';
    let pass = false;

    if (error) {
      status = 'error';
    } else if (value === null || value === undefined) {
      status = 'missing_data';
    } else {
      const targetType = okr.target.type;
      const targetValue = okr.target.value;

      if (targetType === 'max') {
        pass = value <= targetValue;
      } else if (targetType === 'min') {
        pass = value >= targetValue;
      }

      status = pass ? 'pass' : 'fail';
    }

    if (status === 'pass') onTrackCount++;
    if (status === 'fail') atRiskCount++;

    results.push({
      ...okr,
      current_value: value,
      status,
      error
    });
  }

  // 4. Generate Output
  const outputData = {
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    summary: {
      total: okrs.length,
      on_track: onTrackCount,
      at_risk: atRiskCount,
      unknown: okrs.length - onTrackCount - atRiskCount
    },
    results
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_MD);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputData, null, 2));
  console.log(`JSON report written to ${OUTPUT_JSON}`);

  // Write Markdown
  let mdContent = `# CI Quality OKR Status
Generated: ${outputData.generated_at}

## Summary
* **Total OKRs:** ${okrs.length}
* **On Track:** ${onTrackCount}
* **At Risk:** ${atRiskCount}
* **Unknown/Missing:** ${outputData.summary.unknown}

## Details

| Status | ID | Name | Current | Target | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const res of results) {
    let statusIcon = '⚠️';
    if (res.status === 'pass') statusIcon = '✅';
    if (res.status === 'fail') statusIcon = '❌';
    if (res.status === 'missing_data') statusIcon = '❓';

    const targetStr = `${res.target.type} ${res.target.value}`;
    const valueStr = res.current_value !== null ? res.current_value : 'N/A';

    mdContent += `| ${statusIcon} | ${res.id} | ${res.name} | ${valueStr} | ${targetStr} | ${res.source} |\n`;
  }

  if (atRiskCount > 0 || outputData.summary.unknown > 0) {
    mdContent += `\n## Recommendations\n`;
    for (const res of results) {
      if (res.status === 'fail') {
         mdContent += `* **${res.name}** (❌): Current ${res.current_value} vs target ${res.target.value}. `;
         if (res.id === 'OKR-CI-001') mdContent += "Investigate top failure clusters in recent runs.";
         if (res.id === 'OKR-CI-002') mdContent += "Prioritize fixing P0 failures.";
         if (res.id === 'OKR-CI-003') mdContent += "Address the top regressing error code immediately.";
         if (res.id === 'OKR-CI-004') mdContent += "Review recent PRs for performance regressions or bloat.";
         if (res.id === 'OKR-CI-005') mdContent += "Ensure failure artifacts are being uploaded correctly.";
         mdContent += "\n";
      } else if (res.status === 'missing_data') {
         mdContent += `* **${res.name}** (❓): Data unavailable. Ensure source '${res.source}' is generating metric '${res.metric}'.\n`;
      }
    }
  }

  fs.writeFileSync(OUTPUT_MD, mdContent);
  console.log(`Markdown report written to ${OUTPUT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
