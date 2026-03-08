#!/usr/bin/env node
/**
 * Workflow Cost Analysis
 *
 * Analyzes CI cost impact of workflow consolidation:
 * 1. Calculates workflow runs before/after consolidation
 * 2. Estimates compute minutes saved
 * 3. Estimates cost savings (GitHub Actions pricing)
 * 4. Shows environmental impact (CO2 saved)
 *
 * Run: node scripts/ci/workflow-cost-analysis.mjs
 */

// Configuration
const WORKFLOWS_BEFORE = 260;
const WORKFLOWS_AFTER = 8;
const AVG_WORKFLOWS_PER_PR_BEFORE = 260; // All workflows triggered
const AVG_WORKFLOWS_PER_PR_AFTER = 3.5; // Path-filtered average (pr-gate + 0-3 others)
const AVG_WORKFLOW_DURATION_MINUTES = 5; // Average workflow runtime
const AVG_PRS_PER_DAY = 20; // Estimated PR volume
const GITHUB_ACTIONS_COST_PER_MINUTE = 0.008; // $0.008/minute for Linux runners
const CO2_PER_COMPUTE_MINUTE_KG = 0.0001; // Estimated CO2 per compute minute

// ANSI colors
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(color, ...args) {
  console.log(`${color}${args.join(" ")}${RESET}`);
}

function formatNumber(num) {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatCurrency(amount) {
  return `$${formatNumber(amount)}`;
}

function formatPercent(value) {
  return `${formatNumber(value)}%`;
}

function main() {
  log(BLUE, "\n=== CI Workflow Cost Analysis ===\n");

  // Daily metrics
  const workflowRunsPerDayBefore = AVG_PRS_PER_DAY * AVG_WORKFLOWS_PER_PR_BEFORE;
  const workflowRunsPerDayAfter = AVG_PRS_PER_DAY * AVG_WORKFLOWS_PER_PR_AFTER;
  const workflowRunsSavedPerDay = workflowRunsPerDayBefore - workflowRunsPerDayAfter;

  log(BOLD, "Daily Impact");
  log(BLUE, `PRs per day: ${formatNumber(AVG_PRS_PER_DAY)}`);
  log(BLUE, `\nWorkflow runs per day:`);
  log(BLUE, `  Before: ${formatNumber(workflowRunsPerDayBefore)} runs`);
  log(GREEN, `  After:  ${formatNumber(workflowRunsPerDayAfter)} runs`);
  log(GREEN, `  Saved:  ${formatNumber(workflowRunsSavedPerDay)} runs (${formatPercent(
    (workflowRunsSavedPerDay / workflowRunsPerDayBefore) * 100
  )})`);

  // Compute minutes
  const computeMinutesPerDayBefore =
    workflowRunsPerDayBefore * AVG_WORKFLOW_DURATION_MINUTES;
  const computeMinutesPerDayAfter =
    workflowRunsPerDayAfter * AVG_WORKFLOW_DURATION_MINUTES;
  const computeMinutesSavedPerDay =
    computeMinutesPerDayBefore - computeMinutesPerDayAfter;

  log(BLUE, `\nCompute minutes per day:`);
  log(BLUE, `  Before: ${formatNumber(computeMinutesPerDayBefore)} minutes`);
  log(GREEN, `  After:  ${formatNumber(computeMinutesPerDayAfter)} minutes`);
  log(GREEN, `  Saved:  ${formatNumber(computeMinutesSavedPerDay)} minutes (${formatPercent(
    (computeMinutesSavedPerDay / computeMinutesPerDayBefore) * 100
  )})`);

  // Monthly projections
  const DAYS_PER_MONTH = 30;
  const workflowRunsSavedPerMonth = workflowRunsSavedPerDay * DAYS_PER_MONTH;
  const computeMinutesSavedPerMonth = computeMinutesSavedPerDay * DAYS_PER_MONTH;

  log(BOLD, "\n\nMonthly Impact (30 days)");
  log(GREEN, `Workflow runs saved: ${formatNumber(workflowRunsSavedPerMonth)} runs`);
  log(GREEN, `Compute minutes saved: ${formatNumber(computeMinutesSavedPerMonth)} minutes`);
  log(GREEN, `Compute hours saved: ${formatNumber(computeMinutesSavedPerMonth / 60)} hours`);

  // Cost savings
  const costPerDayBefore =
    computeMinutesPerDayBefore * GITHUB_ACTIONS_COST_PER_MINUTE;
  const costPerDayAfter = computeMinutesPerDayAfter * GITHUB_ACTIONS_COST_PER_MINUTE;
  const costSavedPerDay = costPerDayBefore - costPerDayAfter;
  const costSavedPerMonth = costSavedPerDay * DAYS_PER_MONTH;
  const costSavedPerYear = costSavedPerMonth * 12;

  log(BOLD, "\n\nCost Savings (@ $0.008/minute)");
  log(BLUE, `Cost per day:`);
  log(BLUE, `  Before: ${formatCurrency(costPerDayBefore)}/day`);
  log(GREEN, `  After:  ${formatCurrency(costPerDayAfter)}/day`);
  log(GREEN, `  Saved:  ${formatCurrency(costSavedPerDay)}/day (${formatPercent(
    (costSavedPerDay / costPerDayBefore) * 100
  )})`);
  log(BLUE, `\nProjected savings:`);
  log(GREEN, `  Monthly: ${formatCurrency(costSavedPerMonth)}`);
  log(GREEN, `  Yearly:  ${formatCurrency(costSavedPerYear)}`);

  // Developer time savings
  const AVG_WAIT_TIME_PER_PR_BEFORE_MINUTES = 45; // Time waiting for CI
  const AVG_WAIT_TIME_PER_PR_AFTER_MINUTES = 10; // With path filtering
  const timeSavedPerPR = AVG_WAIT_TIME_PER_PR_BEFORE_MINUTES - AVG_WAIT_TIME_PER_PR_AFTER_MINUTES;
  const timeSavedPerDay = (AVG_PRS_PER_DAY * timeSavedPerPR) / 60; // hours
  const timeSavedPerMonth = timeSavedPerDay * DAYS_PER_MONTH;
  const DEVELOPER_HOURLY_RATE = 100; // Estimated fully-loaded cost
  const devCostSavedPerMonth = timeSavedPerMonth * DEVELOPER_HOURLY_RATE;
  const devCostSavedPerYear = devCostSavedPerMonth * 12;

  log(BOLD, "\n\nDeveloper Productivity");
  log(BLUE, `Avg wait time per PR:`);
  log(BLUE, `  Before: ${AVG_WAIT_TIME_PER_PR_BEFORE_MINUTES} minutes`);
  log(GREEN, `  After:  ${AVG_WAIT_TIME_PER_PR_AFTER_MINUTES} minutes`);
  log(GREEN, `  Saved:  ${timeSavedPerPR} minutes per PR (${formatPercent(
    (timeSavedPerPR / AVG_WAIT_TIME_PER_PR_BEFORE_MINUTES) * 100
  )})`);
  log(BLUE, `\nDeveloper hours saved:`);
  log(GREEN, `  Daily:   ${formatNumber(timeSavedPerDay)} hours`);
  log(GREEN, `  Monthly: ${formatNumber(timeSavedPerMonth)} hours`);
  log(GREEN, `  Yearly:  ${formatNumber(timeSavedPerMonth * 12)} hours`);
  log(BLUE, `\nDeveloper cost savings (@ ${formatCurrency(DEVELOPER_HOURLY_RATE)}/hour):`);
  log(GREEN, `  Monthly: ${formatCurrency(devCostSavedPerMonth)}`);
  log(GREEN, `  Yearly:  ${formatCurrency(devCostSavedPerYear)}`);

  // Total savings
  const totalSavingsPerMonth = costSavedPerMonth + devCostSavedPerMonth;
  const totalSavingsPerYear = costSavedPerYear + devCostSavedPerYear;

  log(BOLD, "\n\nTotal Savings");
  log(GREEN, `Monthly: ${formatCurrency(totalSavingsPerMonth)} (CI: ${formatCurrency(
    costSavedPerMonth
  )} + Dev: ${formatCurrency(devCostSavedPerMonth)})`);
  log(GREEN, `Yearly:  ${formatCurrency(totalSavingsPerYear)} (CI: ${formatCurrency(
    costSavedPerYear
  )} + Dev: ${formatCurrency(devCostSavedPerYear)})`);

  // Environmental impact
  const co2SavedPerDay = computeMinutesSavedPerDay * CO2_PER_COMPUTE_MINUTE_KG;
  const co2SavedPerMonth = co2SavedPerDay * DAYS_PER_MONTH;
  const co2SavedPerYear = co2SavedPerMonth * 12;
  const TREES_OFFSET_KG_PER_YEAR = 21; // One tree offsets ~21kg CO2/year
  const treesEquivalent = co2SavedPerYear / TREES_OFFSET_KG_PER_YEAR;

  log(BOLD, "\n\nEnvironmental Impact");
  log(GREEN, `CO2 saved:`);
  log(GREEN, `  Daily:   ${formatNumber(co2SavedPerDay)} kg`);
  log(GREEN, `  Monthly: ${formatNumber(co2SavedPerMonth)} kg`);
  log(GREEN, `  Yearly:  ${formatNumber(co2SavedPerYear)} kg`);
  log(GREEN, `\nEquivalent to planting ${formatNumber(treesEquivalent)} trees per year 🌳`);

  // ROI
  const IMPLEMENTATION_COST_HOURS = 8; // Time spent on consolidation
  const implementationCost = IMPLEMENTATION_COST_HOURS * DEVELOPER_HOURLY_RATE;
  const monthsToROI = implementationCost / totalSavingsPerMonth;
  const daysToROI = monthsToROI * DAYS_PER_MONTH;

  log(BOLD, "\n\nReturn on Investment");
  log(BLUE, `Implementation cost: ${formatCurrency(implementationCost)} (${IMPLEMENTATION_COST_HOURS} hours @ ${formatCurrency(DEVELOPER_HOURLY_RATE)}/hour)`);
  log(GREEN, `Time to ROI: ${formatNumber(daysToROI)} days (${formatNumber(monthsToROI)} months)`);
  log(GREEN, `ROI after 1 year: ${formatNumber(
    (totalSavingsPerYear / implementationCost - 1) * 100
  )}%`);

  // Summary
  log(BOLD, "\n\n=== Summary ===\n");
  log(GREEN, `✅ Workflow runs reduced by ${formatPercent(
    ((workflowRunsPerDayBefore - workflowRunsPerDayAfter) / workflowRunsPerDayBefore) * 100
  )}`);
  log(GREEN, `✅ CI costs reduced by ${formatCurrency(costSavedPerMonth)}/month`);
  log(GREEN, `✅ Developer time saved: ${formatNumber(timeSavedPerMonth)} hours/month`);
  log(GREEN, `✅ Total savings: ${formatCurrency(totalSavingsPerYear)}/year`);
  log(GREEN, `✅ CO2 emissions reduced by ${formatNumber(co2SavedPerYear)} kg/year`);
  log(GREEN, `✅ ROI achieved in ${formatNumber(daysToROI)} days`);

  log(BLUE, "\n");
}

main();
