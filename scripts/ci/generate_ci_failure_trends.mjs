import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { program } from 'commander';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

// Configuration
program
  .option('--days <number>', 'Number of days to analyze', '7')
  .option('--baseline-days <number>', 'Number of days for baseline comparison', '7')
  .option('--out <path>', 'Output path for markdown report', 'artifacts/ci-trends/report.md')
  .option('--mock-data <path>', 'Path to mock data JSON (bypasses API calls)')
  .option('--repo <string>', 'Repository name (owner/repo)', process.env.GITHUB_REPOSITORY)
  .parse(process.argv);

const options = program.opts();

// Constants
const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GH_TOKEN;

async function main() {
  const reportDate = new Date().toISOString().split('T')[0];
  const days = parseInt(options.days, 10);
  const baselineDays = parseInt(options.baselineDays, 10);

  let currentFailures = [];
  let baselineFailures = [];

  // Data Gathering
  if (options.mockData) {
    console.log(`Using mock data from ${options.mockData}`);
    const mockData = JSON.parse(fs.readFileSync(options.mockData, 'utf-8'));
    currentFailures = mockData.current_window || [];
    baselineFailures = mockData.baseline_window || [];
  } else {
    if (!TOKEN) {
      console.error("GH_TOKEN is required for API access.");
      process.exit(1);
    }
    if (!options.repo) {
      console.error("Repo is required (e.g. --repo owner/name or GITHUB_REPOSITORY env var).");
      process.exit(1);
    }

    console.log(`Fetching data for ${options.repo}...`);

    const now = new Date();
    const windowStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const baselineStart = new Date(windowStart.getTime() - (baselineDays * 24 * 60 * 60 * 1000));

    console.log(`Window: ${windowStart.toISOString()} to ${now.toISOString()}`);
    console.log(`Baseline: ${baselineStart.toISOString()} to ${windowStart.toISOString()}`);

    // Fetch failures
    const allFailures = await fetchFailedRuns(options.repo, baselineStart.toISOString());
    console.log(`Found ${allFailures.length} total failures since ${baselineStart.toISOString()}`);

    // Split into windows
    for (const run of allFailures) {
      const runDate = new Date(run.created_at);
      if (runDate >= windowStart) {
        currentFailures.push(run);
      } else if (runDate >= baselineStart) {
        baselineFailures.push(run);
      }
    }

    // Hydrate with triage data
    console.log(`Hydrating ${currentFailures.length} current failures with triage data...`);
    await hydrateWithTriage(currentFailures, options.repo);

    console.log(`Hydrating ${baselineFailures.length} baseline failures with triage data...`);
    await hydrateWithTriage(baselineFailures, options.repo);
  }

  // Processing
  const stats = processFailures(currentFailures, baselineFailures);

  // Report Generation
  const markdown = generateMarkdown(stats, days, reportDate);
  const json = JSON.stringify(stats, null, 2);

  // Output
  const outDir = path.dirname(options.out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(options.out, markdown);
  fs.writeFileSync(options.out.replace('.md', '.json'), json);

  // Job Summary Output
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = generateJobSummary(stats);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  console.log(`Report generated at ${options.out}`);
}

async function fetchFailedRuns(repo, since) {
  const runs = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const url = `${GITHUB_API}/repos/${repo}/actions/runs?status=failure&per_page=${perPage}&page=${page}&created=>${since}`;
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.data.workflow_runs || res.data.workflow_runs.length === 0) break;

      runs.push(...res.data.workflow_runs);

      if (res.data.workflow_runs.length < perPage) break;
      page++;
    } catch (err) {
      console.error(`Error fetching runs: ${err.message}`);
      break;
    }
  }
  return runs;
}

async function hydrateWithTriage(runs, repo) {
  // Use a temp dir for artifacts
  const tmpDir = fs.mkdtempSync(path.join(path.sep, 'tmp', 'triage-artifacts-'));

  for (const run of runs) {
    try {
      // List artifacts
      const artifactsUrl = `${GITHUB_API}/repos/${repo}/actions/runs/${run.id}/artifacts`;
      const res = await axios.get(artifactsUrl, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const triageArtifact = res.data.artifacts.find(a => a.name.includes('triage'));

      if (triageArtifact) {
        // Download
        const zipPath = path.join(tmpDir, `${run.id}.zip`);
        await downloadFile(triageArtifact.archive_download_url, zipPath);

        // Unzip (using system unzip as per plan)
        const extractPath = path.join(tmpDir, `${run.id}`);
        fs.mkdirSync(extractPath);

        try {
            execSync(`unzip -q ${zipPath} -d ${extractPath}`);
            const triageJsonPath = path.join(extractPath, 'triage.json');

            if (fs.existsSync(triageJsonPath)) {
                const triageData = JSON.parse(fs.readFileSync(triageJsonPath, 'utf-8'));
                run.triage = triageData;
            }
        } catch (e) {
            console.warn(`Failed to extract/parse artifact for run ${run.id}: ${e.message}`);
        }
      }
    } catch (err) {
      console.warn(`Error processing artifact for run ${run.id}: ${err.message}`);
    }
  }

  // Cleanup
  try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
      console.warn(`Cleanup failed: ${e.message}`);
  }
}

async function downloadFile(url, dest) {
    const response = await axios.get(url, {
        responseType: 'stream',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    await streamPipeline(response.data, createWriteStream(dest));
}

function processFailures(current, baseline) {
  const currentCounts = aggregateCounts(current);
  const baselineCounts = aggregateCounts(baseline);

  const uniqueCodes = new Set([...Object.keys(currentCounts.byCode), ...Object.keys(baselineCounts.byCode)]);

  const codes = [];

  for (const code of uniqueCodes) {
    const curr = currentCounts.byCode[code] || { count: 0, severity: 'info', examples: [] };
    const base = baselineCounts.byCode[code] || { count: 0 };

    const delta = curr.count - base.count;

    // Logic: Regression if count_this_week >= count_last_week + 3 OR +50% (whichever is larger), min count 5
    const threshold = Math.max(3, Math.ceil(base.count * 0.5));
    const isRegression = curr.count >= 5 && delta >= threshold;

    // Logic: New code if absent last week and count_this_week >= 3
    const isNew = base.count === 0 && curr.count >= 3;

    codes.push({
      code,
      count: curr.count,
      baseline: base.count,
      delta,
      severity: curr.severity,
      workflow: curr.topWorkflow,
      isRegression,
      isNew,
      examples: curr.examples.slice(0, 3) // Top 3 examples
    });
  }

  // Sort by count desc
  codes.sort((a, b) => b.count - a.count);

  const regressions = codes.filter(c => c.isRegression);
  const newCodes = codes.filter(c => c.isNew);

  // Recommendations
  const actionQueue = {
    p0: [],
    p1: [],
    p2: []
  };

  for (const c of codes) {
    if (c.count === 0) continue; // Skip codes not present in current window

    if (c.severity === 'fail' && (c.count >= 10 || c.isRegression)) {
      actionQueue.p0.push(c);
    } else if (c.severity === 'warn' && (c.count >= 10 || c.isRegression)) {
      actionQueue.p1.push(c);
    } else {
      actionQueue.p2.push(c); // Everything else above noise threshold (implicit)
    }
  }

  return {
    window: { days: options.days },
    totals: {
      failures: current.length,
      uniqueCodes: Object.keys(currentCounts.byCode).length,
      uniqueWorkflows: Object.keys(currentCounts.byWorkflow).length
    },
    codes,
    regressions,
    newCodes,
    actionQueue,
    dataQuality: {
        missingTriage: current.filter(r => !r.triage).length
    }
  };
}

function aggregateCounts(failures) {
  const byCode = {};
  const byWorkflow = {};

  for (const f of failures) {
    const code = f.triage?.failure_code || 'UNKNOWN';
    const severity = f.triage?.severity || 'info';
    const workflow = f.triage?.workflow || f.name || 'Unknown';

    // By Code
    if (!byCode[code]) {
      byCode[code] = { count: 0, severity, examples: [], workflows: {} };
    }
    byCode[code].count++;
    byCode[code].examples.push(f.html_url);
    byCode[code].workflows[workflow] = (byCode[code].workflows[workflow] || 0) + 1;

    // By Workflow
    byWorkflow[workflow] = (byWorkflow[workflow] || 0) + 1;
  }

  // Determine top workflow for each code
  for (const code in byCode) {
    let topWf = '';
    let max = -1;
    for (const wf in byCode[code].workflows) {
      if (byCode[code].workflows[wf] > max) {
        max = byCode[code].workflows[wf];
        topWf = wf;
      }
    }
    byCode[code].topWorkflow = topWf;
  }

  return { byCode, byWorkflow };
}

function generateMarkdown(stats, days, date) {
  let md = `# CI Failure Trend Report (${date})\n\n`;
  md += `**Window**: Last ${days} days\n`;
  md += `**Total Failures**: ${stats.totals.failures}\n`;
  md += `**Unique Failure Codes**: ${stats.totals.uniqueCodes}\n`;
  md += `**Unique Workflows Affected**: ${stats.totals.uniqueWorkflows}\n`;
  md += `**Missing Triage Artifacts**: ${stats.dataQuality.missingTriage}\n\n`;

  // Action Queue
  md += `## 🚨 Action Queue\n\n`;
  if (stats.actionQueue.p0.length > 0) {
    md += `### P0 (Critical)\n`;
    stats.actionQueue.p0.forEach(c => md += `- **${c.code}** (${c.count} failures): ${c.workflow}\n`);
  }
  if (stats.actionQueue.p1.length > 0) {
    md += `### P1 (Major)\n`;
    stats.actionQueue.p1.forEach(c => md += `- **${c.code}** (${c.count} failures): ${c.workflow}\n`);
  }
  if (stats.actionQueue.p2.length > 0) {
    md += `### P2 (Minor)\n`;
    stats.actionQueue.p2.forEach(c => md += `- **${c.code}** (${c.count} failures): ${c.workflow}\n`);
  }
  if (stats.actionQueue.p0.length === 0 && stats.actionQueue.p1.length === 0 && stats.actionQueue.p2.length === 0) {
      md += "_No items in action queue._\n";
  }
  md += `\n`;

  // Top Failures Table
  md += `## 📊 Top Failure Codes\n\n`;
  md += `| Code | Count | Delta | Severity | Top Workflow |\n`;
  md += `|---|---|---|---|---|\n`;
  stats.codes.slice(0, 10).forEach(c => {
    const deltaSign = c.delta > 0 ? '+' : '';
    md += `| ${c.code} | ${c.count} | ${deltaSign}${c.delta} | ${c.severity} | ${c.workflow} |\n`;
  });
  md += `\n`;

  // New Codes
  md += `## 🆕 New Codes\n\n`;
  if (stats.newCodes.length > 0) {
      stats.newCodes.forEach(c => md += `- **${c.code}** (${c.count} failures)\n`);
  } else {
      md += "_No new failure codes detected._\n";
  }
  md += `\n`;

  // Regressions
  md += `## 📈 Regressions\n\n`;
  if (stats.regressions.length > 0) {
      stats.regressions.forEach(c => md += `- **${c.code}** is UP ${c.delta} (Total: ${c.count})\n`);
  } else {
      md += "_No significant regressions._\n";
  }
  md += `\n`;

  // Examples
  md += `## 🔍 Examples (Top 5)\n\n`;
  stats.codes.slice(0, 5).forEach(c => {
      md += `### ${c.code}\n`;
      c.examples.forEach(url => md += `- ${url}\n`);
      md += `\n`;
  });

  return md;
}

function generateJobSummary(stats) {
    let md = `### CI Failure Trends Summary\n\n`;
    md += `**Failures**: ${stats.totals.failures} | **Unique Codes**: ${stats.totals.uniqueCodes}\n\n`;

    if (stats.actionQueue.p0.length > 0) {
        md += `🚨 **${stats.actionQueue.p0.length} P0 Issues Detected**\n`;
    }

    md += `\n**Top Issues:**\n`;
    stats.codes.slice(0, 3).forEach(c => {
        md += `- ${c.code} (${c.count})\n`;
    });

    if (stats.newCodes.length > 0) {
        md += `\n**🆕 New Codes:**\n`;
        stats.newCodes.forEach(c => md += `- ${c.code}\n`);
    }

    if (stats.regressions.length > 0) {
        md += `\n**📈 Regressions:**\n`;
        stats.regressions.forEach(c => md += `- ${c.code} (+${c.delta})\n`);
    }

    return md;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
