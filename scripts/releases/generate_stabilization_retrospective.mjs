#!/usr/bin/env node

import { program } from 'commander';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const GITHUB_OWNER = 'BrianCLong';
const GITHUB_REPO = 'summit';
const WORKFLOW_FILE_NAME = 'weekly-ops-evidence.yml';

async function main(options) {
  const { weeks, outDir, token, fixture } = options;

  let weeklyData;

  if (fixture) {
    console.log(`Using fixture file: ${fixture}`);
    const fixturePath = path.resolve(fixture);
    const fixtureContent = await fs.readFile(fixturePath, 'utf-8');
    weeklyData = JSON.parse(fixtureContent);
  } else {
    if (!token) {
      console.error('GitHub token is required. Set the GITHUB_TOKEN environment variable or use the --token option.');
      process.exit(1);
    }
    const octokit = new Octokit({ auth: token });
    weeklyData = await fetchWeeklyDataFromGitHub(octokit, weeks);
  }

  if (!weeklyData || weeklyData.length === 0) {
    console.log('No data available to generate a report. Exiting cleanly.');
    process.exit(78); // Special exit code for "no data"
  }

  if (weeklyData.length < 4) {
    console.log(`Reduced confidence: Only ${weeklyData.length} weeks of data available.`);
  }

  // Data from API is newest first, reverse for chronological order in trends
  weeklyData.reverse();

  const aggregatedData = aggregateWeeklyData(weeklyData);
  const recommendations = generateRecommendations(aggregatedData);

  const reportDate = new Date().toISOString().split('T')[0];
  const startDate = weeklyData[0]?.week_ending || 'N/A';
  const endDate = weeklyData[weeklyData.length - 1]?.week_ending || 'N/A';

  const markdownReport = generateMarkdownReport(aggregatedData, recommendations, weeklyData.length, startDate, endDate);
  const jsonReport = JSON.stringify({ aggregatedData, recommendations, sourceData: weeklyData }, null, 2);

  await fs.mkdir(outDir, { recursive: true });

  const markdownFileName = `RETRO_${reportDate}_WINDOW_${startDate}_TO_${endDate}.md`;
  const jsonFileName = `retro_${reportDate}_window_${startDate}_to_${endDate}.json`;

  await fs.writeFile(path.join(outDir, markdownFileName), markdownReport);
  await fs.writeFile(path.join(outDir, jsonFileName), jsonReport);

  console.log(`Successfully generated retrospective reports in ${outDir}`);
}

async function fetchWeeklyDataFromGitHub(octokit, weeks) {
  console.log(`Fetching last ${weeks} workflow runs for ${WORKFLOW_FILE_NAME}...`);
  try {
    const { data: { workflow_runs } } = await octokit.actions.listWorkflowRuns({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      workflow_id: WORKFLOW_FILE_NAME,
      status: 'success',
      per_page: weeks,
    });

    if (workflow_runs.length === 0) {
      console.log('No successful workflow runs found.');
      return [];
    }

    const weeklyData = [];
    for (const run of workflow_runs) {
      console.log(`Processing workflow run ${run.id}...`);
      const { data: { artifacts } } = await octokit.actions.listWorkflowRunArtifacts({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        run_id: run.id,
      });

      const artifact = artifacts.find(a => a.name === 'weekly-evidence');
      if (!artifact) {
        console.log(` - No 'weekly-evidence' artifact found for run ${run.id}.`);
        continue;
      }

      const { data: artifactData } = await octokit.actions.downloadArtifact({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        artifact_id: artifact.id,
        archive_format: 'zip',
      });

      const zip = await JSZip.loadAsync(artifactData);
      const scorecard = JSON.parse(await zip.file('scorecard.json').async('string'));
      const escalation = JSON.parse(await zip.file('escalation.json').async('string'));
      const diff = JSON.parse(await zip.file('diff.json').async('string'));

      weeklyData.push({
        week_ending: run.created_at.split('T')[0],
        scorecard,
        escalation,
        diff,
      });
    }
    return weeklyData;
  } catch (error) {
    console.error('Error fetching or processing workflow runs from GitHub:', error);
    process.exit(1);
  }
}

function aggregateWeeklyData(weeklyData) {
  const trends = {
    risk_index: [],
    done_p0: [],
    done_p1: [],
    on_time_rate: [],
    overdue_load: [],
    evidence_compliance: [],
    issuance_completeness: [],
    blocked_unissued_p0: [],
    week_ending: [],
  };

  const blockerCounts = new Map();

  for (const week of weeklyData) {
    trends.week_ending.push(week.week_ending);
    trends.risk_index.push(week.scorecard.risk_index);
    trends.done_p0.push(week.scorecard.done_p0);
    trends.done_p1.push(week.scorecard.done_p1);
    trends.on_time_rate.push(week.scorecard.on_time_rate);
    trends.overdue_load.push(week.scorecard.overdue_load);
    trends.evidence_compliance.push(week.scorecard.evidence_compliance);
    trends.issuance_completeness.push(week.scorecard.issuance_completeness);

    const p0Blocked = week.diff.blocked_unissued?.filter(item => item.priority === 'P0').length || 0;
    trends.blocked_unissued_p0.push(p0Blocked);

    for (const item of week.escalation.overdue_items || []) {
      const count = blockerCounts.get(item.id) || { ...item, count: 0 };
      count.count++;
      blockerCounts.set(item.id, count);
    }
  }

  const recurring_blockers = [...blockerCounts.values()]
    .filter(b => b.count >= 2)
    .sort((a, b) => b.count - a.count);

  return { trends, recurring_blockers };
}

function generateRecommendations({ trends }) {
  const recommendations = [];
  const lastIndex = trends.risk_index.length - 1;

  if (trends.blocked_unissued_p0.some(v => v > 0)) {
    recommendations.push({
      focus: 'Issuance Hygiene',
      rationale: 'P0 items were blocked from issuance in one or more weeks, indicating a critical process bottleneck.'
    });
  }

  if (trends.evidence_compliance[lastIndex] < 0.95) {
    recommendations.push({
      focus: 'Evidence Capture Enforcement',
      rationale: `Evidence compliance ended at ${(trends.evidence_compliance[lastIndex] * 100).toFixed(0)}%, which is below the 95% target.`
    });
  }

  if (trends.overdue_load[lastIndex] > trends.overdue_load[0]) {
      recommendations.push({
          focus: 'SLA Adherence and Scope Control',
          rationale: `Overdue load is rising, increasing from ${trends.overdue_load[0]} to ${trends.overdue_load[lastIndex]}.`
      });
  }

  const avgOnTimeRate = trends.on_time_rate.reduce((a, b) => a + b, 0) / trends.on_time_rate.length;
  if (avgOnTimeRate < 0.90) {
      recommendations.push({
          focus: 'Target Date Realism and Prioritization',
          rationale: `The average on-time rate is ${(avgOnTimeRate * 100).toFixed(0)}%, below the 90% target.`
      });
  }

  return recommendations.slice(0, 5);
}

function getDelta(metric, first, last) {
    const change = last - first;
    const isGood = ['risk_index', 'overdue_load'].includes(metric) ? change < 0 : change > 0;
    const symbol = change === 0 ? '→' : isGood ? '▲' : '▼';
    const formattedChange = `${symbol} ${Math.abs(change).toFixed(2)}`;
    return { improved: isGood, text: `${metric.replace(/_/g, ' ')} changed from ${first.toFixed(2)} to ${last.toFixed(2)} (${formattedChange})` };
}

function generateMarkdownReport(aggregatedData, recommendations, weekCount, startDate, endDate) {
  const { trends, recurring_blockers } = aggregatedData;
  const weekHeaders = trends.week_ending.map(date => date.slice(5)).join(' | ');
  const headerLine = '-'.repeat(weekHeaders.length);

  const deltas = {};
  const lastIndex = trends.risk_index.length - 1;
  if (lastIndex > 0) {
      for (const key of Object.keys(trends)) {
          if (key !== 'week_ending') {
            deltas[key] = getDelta(key, trends[key][0], trends[key][lastIndex]);
          }
      }
  }

  const improved = Object.values(deltas).filter(d => d.improved).map(d => `* ${d.text}`);
  const regressed = Object.values(deltas).filter(d => !d.improved).map(d => `* ${d.text}`);

  return `# Stabilization Retrospective

## Window: ${startDate} to ${endDate}

### Data Quality
This report was generated using data from **${weekCount}** weekly closeouts.
${weekCount < 4 ? '\n**Confidence:** Reduced due to fewer than 4 data points.' : ''}

### What's Changed
**What Improved**
${improved.length > 0 ? improved.join('\n') : '* No significant improvements.'}

**What Regressed**
${regressed.length > 0 ? regressed.join('\n') : '* No significant regressions.'}


### Overall Trends

| Metric                  | ${weekHeaders} |
|-------------------------|${headerLine}|
| Risk Index              | ${trends.risk_index.join(' | ')} |
| P0 Done                 | ${trends.done_p0.join(' | ')} |
| P1 Done                 | ${trends.done_p1.join(' | ')} |
| On Time Rate            | ${trends.on_time_rate.join(' | ')} |
| Overdue Load            | ${trends.overdue_load.join(' | ')} |
| Evidence Compliance     | ${trends.evidence_compliance.join(' | ')} |

### Focus for Next Month

${recommendations.length > 0 ? recommendations.map(r => `* **${r.focus}:** ${r.rationale}`).join('\n') : '* No specific focus areas identified by the rules.'}

### Recurring Blockers (Top 10)

${recurring_blockers.length > 0 ? recurring_blockers.slice(0, 10).map(b => `* **[${b.id}]** ${b.title} (overdue in ${b.count} weeks)`).join('\n') : '* No recurring blockers identified.'}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  program
    .option('--weeks <number>', 'Number of weeks to analyze', '4')
    .option('--out-dir <path>', 'Output directory for reports', 'artifacts/stabilization/retrospective')
    .option('--token <token>', 'GitHub token', process.env.GITHUB_TOKEN)
    .option('--fixture <path>', 'Path to a fixture JSON file for local testing')
    .parse(process.argv);

  main(program.opts());
}
