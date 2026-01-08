import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';

const ARTIFACTS_DIR = 'artifacts/perf-budget';
const TIMINGS_FILE = join(ARTIFACTS_DIR, 'timings.json');
const REPORT_JSON = join(ARTIFACTS_DIR, 'report.json');
const REPORT_MD = join(ARTIFACTS_DIR, 'report.md');
const POLICY_FILE = 'policy/performance-budgets.yaml';

async function main() {
  try {
    console.log('[PerfBudget] Generating report...');

    // 1. Load Data
    let timings = {};
    try {
      const timingsRaw = await readFile(TIMINGS_FILE, 'utf8');
      timings = JSON.parse(timingsRaw);
    } catch (e) {
      console.warn('[PerfBudget] No timings file found. Generating empty report.');
    }

    const policyRaw = await readFile(POLICY_FILE, 'utf8');
    const policy = yaml.load(policyRaw);
    const budgets = policy.performance_budgets;

    const isReleaseIntent = process.env.IS_RELEASE_INTENT === 'true';
    const jobName = process.env.JOB_NAME || 'ga_verify'; // Default to ga_verify budget key

    // 2. Compute Metrics
    const report = {
      timestamp: new Date().toISOString(),
      status: 'PASS',
      mode: isReleaseIntent ? 'RELEASE' : 'NORMAL',
      violations: [],
      warnings: [],
      timings: timings,
      summary: []
    };

    // Calculate Job Total Duration
    let totalDuration = 0;
    if (timings._job_start) {
      totalDuration = (Date.now() - timings._job_start) / 1000;
      timings._job_total = { duration_seconds: totalDuration }; // Virtual step
    } else {
       // Sum up known steps as fallback
       totalDuration = Object.values(timings)
         .filter(v => typeof v === 'object' && v.duration_seconds)
         .reduce((acc, v) => acc + v.duration_seconds, 0);
    }

    // Check Job Level Budget
    const jobBudget = budgets.budgets[jobName] || budgets.budgets['ga_verify']; // Fallback
    if (jobBudget) {
      const maxSeconds = jobBudget.max_minutes * 60;
      if (totalDuration > maxSeconds) {
        const msg = `Job total duration ${totalDuration.toFixed(1)}s exceeds budget ${maxSeconds}s`;
        if (isReleaseIntent && budgets.scope.release_intent !== 'warn') {
             report.violations.push(msg);
             report.status = 'FAIL';
        } else {
             report.warnings.push(msg);
             if (report.status !== 'FAIL') report.status = 'WARN';
        }
      }

      // Check Step Budgets
      if (jobBudget.step_budgets) {
        for (const [step, stepMaxMinutes] of Object.entries(jobBudget.step_budgets)) {
          const actual = timings[step];
          if (actual) {
             const stepMaxSeconds = stepMaxMinutes * 60;
             if (actual.duration_seconds > stepMaxSeconds) {
               const msg = `Step '${step}' duration ${actual.duration_seconds.toFixed(1)}s exceeds budget ${stepMaxSeconds}s`;
                if (isReleaseIntent && budgets.scope.release_intent !== 'warn') {
                     report.violations.push(msg);
                     report.status = 'FAIL';
                } else {
                     report.warnings.push(msg);
                     if (report.status !== 'FAIL') report.status = 'WARN';
                }
             }
          }
        }
      }
    }

    // 3. Generate Output
    await writeFile(REPORT_JSON, JSON.stringify(report, null, 2));

    const markdown = generateMarkdown(report, totalDuration, jobBudget);
    await writeFile(REPORT_MD, markdown);

    // Append to GITHUB_STEP_SUMMARY if available
    if (process.env.GITHUB_STEP_SUMMARY) {
      try {
        const { appendFile } = await import('fs/promises');
        await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
        console.log('[PerfBudget] Added report to GITHUB_STEP_SUMMARY.');
      } catch (e) {
        console.warn('[PerfBudget] Failed to write to GITHUB_STEP_SUMMARY:', e);
      }
    }

    console.log(`[PerfBudget] Report generated. Status: ${report.status}`);
    if (report.violations.length > 0) {
      console.error('[PerfBudget] Violations found:');
      report.violations.forEach(v => console.error(` - ${v}`));
    }
    if (report.warnings.length > 0) {
      console.warn('[PerfBudget] Warnings:');
      report.warnings.forEach(v => console.warn(` - ${v}`));
    }

    // 4. Exit Code
    if (isReleaseIntent) {
      if (budgets.calibration.mode === 'warn') {
        console.log('[PerfBudget] Release Intent: Calibration mode active (WARN ONLY).');
        process.exit(0);
      } else {
        if (report.status === 'FAIL') {
          process.exit(1);
        }
      }
    } else {
       console.log('[PerfBudget] Normal PR: Enforcing WARN ONLY.');
       process.exit(0);
    }

  } catch (error) {
    console.error('[PerfBudget] Error generating report:', error);
    process.exit(1);
  }
}

function generateMarkdown(report, totalDuration, jobBudget) {
  const lines = [];
  lines.push(`# Performance Budget Report`);
  lines.push(``);
  lines.push(`**Status**: ${report.status}`);
  lines.push(`**Mode**: ${report.mode}`);
  lines.push(`**Total Duration**: ${totalDuration.toFixed(1)}s (Budget: ${jobBudget ? jobBudget.max_minutes * 60 : 'N/A'}s)`);
  lines.push(``);

  if (report.violations.length > 0) {
    lines.push(`## 🚨 Violations`);
    report.violations.forEach(v => lines.push(`- ${v}`));
    lines.push(``);
  }

  if (report.warnings.length > 0) {
    lines.push(`## ⚠️ Warnings`);
    report.warnings.forEach(v => lines.push(`- ${v}`));
    lines.push(``);
  }

  lines.push(`## Step Timings`);
  lines.push(`| Step | Duration (s) | Budget (s) | Status |`);
  lines.push(`|---|---|---|---|`);

  const steps = Object.keys(report.timings).filter(k => k !== '_job_start' && k !== '_job_total');
  for (const step of steps) {
    const info = report.timings[step];
    const budgetMinutes = jobBudget && jobBudget.step_budgets ? jobBudget.step_budgets[step] : undefined;
    const budgetSeconds = budgetMinutes ? budgetMinutes * 60 : undefined;

    let status = '✅';
    if (budgetSeconds && info.duration_seconds > budgetSeconds) {
      status = '❌';
    }

    lines.push(`| ${step} | ${info.duration_seconds.toFixed(1)} | ${budgetSeconds || '-'} | ${status} |`);
  }

  lines.push(``);
  lines.push(`## Remediation`);
  lines.push(`If steps are failing:`);
  lines.push(`1. **Install**: Check for cache misses.`);
  lines.push(`2. **Build**: Check for unnecessary rebuilds.`);
  lines.push(`3. **Test**: Identify slow tests or consider parallelization.`);

  return lines.join('\n');
}

main();
