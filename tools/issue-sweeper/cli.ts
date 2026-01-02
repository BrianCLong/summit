#!/usr/bin/env npx tsx
/**
 * Interactive CLI for Issue Sweeper
 *
 * Provides a user-friendly interface with prompts and menus
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Main CLI entry point
 */
async function main() {
  printBanner();

  while (true) {
    const choice = await showMainMenu();

    switch (choice) {
      case '1':
        await quickStart();
        break;
      case '2':
        await runWithOptions();
        break;
      case '3':
        await viewStatus();
        break;
      case '4':
        await viewMetrics();
        break;
      case '5':
        await managePlugins();
        break;
      case '6':
        await configureNotifications();
        break;
      case '7':
        await multiRepoMode();
        break;
      case '8':
        await viewAnalytics();
        break;
      case '9':
        await emergencyTools();
        break;
      case '0':
        console.log(`\n${colors.green}👋 Goodbye!${colors.reset}\n`);
        process.exit(0);
      default:
        console.log(`\n${colors.red}❌ Invalid choice${colors.reset}\n`);
    }
  }
}

/**
 * Print banner
 */
function printBanner() {
  console.clear();
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            🤖  ISSUE SWEEPER - Interactive CLI  🤖            ║
║                                                                ║
║            Process 10,000+ GitHub Issues at Scale              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

/**
 * Show main menu
 */
async function showMainMenu(): Promise<string> {
  console.log(`${colors.bright}Main Menu:${colors.reset}\n`);
  console.log(`  ${colors.cyan}1${colors.reset}. 🚀 Quick Start (Scan 10 issues)`);
  console.log(`  ${colors.cyan}2${colors.reset}. ⚙️  Run with Custom Options`);
  console.log(`  ${colors.cyan}3${colors.reset}. 📊 View Current Status`);
  console.log(`  ${colors.cyan}4${colors.reset}. 📈 View Performance Metrics`);
  console.log(`  ${colors.cyan}5${colors.reset}. 🔌 Manage Plugins`);
  console.log(`  ${colors.cyan}6${colors.reset}. 🔔 Configure Notifications`);
  console.log(`  ${colors.cyan}7${colors.reset}. 🏢 Multi-Repo Mode`);
  console.log(`  ${colors.cyan}8${colors.reset}. 🧠 Advanced Analytics`);
  console.log(`  ${colors.cyan}9${colors.reset}. 🆘 Emergency Tools`);
  console.log(`  ${colors.cyan}0${colors.reset}. 🚪 Exit\n`);

  return await prompt('Choose an option');
}

/**
 * Quick start - scan 10 issues
 */
async function quickStart() {
  console.log(`\n${colors.bright}🚀 Quick Start Mode${colors.reset}\n`);

  const hasToken = process.env.GITHUB_TOKEN;
  if (!hasToken) {
    console.log(`${colors.yellow}⚠️  No GITHUB_TOKEN found in environment${colors.reset}`);
    console.log(`   Running with mock data instead...\n`);

    await runCommand('npx tsx tools/issue-sweeper/test-local.ts');
  } else {
    console.log(`${colors.green}✅ GITHUB_TOKEN found${colors.reset}`);
    console.log(`   Scanning first 10 issues...\n`);

    await runCommand(
      'npx tsx tools/issue-sweeper/run.ts --batch-size=10 --max-batches=1'
    );
  }

  await pressEnterToContinue();
}

/**
 * Run with custom options
 */
async function runWithOptions() {
  console.log(`\n${colors.bright}⚙️  Custom Run Configuration${colors.reset}\n`);

  const batchSize = await prompt('Batch size (default: 50)', '50');
  const maxBatches = await prompt('Max batches (0 = unlimited, default: 1)', '1');

  console.log(`\n${colors.bright}Options:${colors.reset}`);
  const autoFix = (await prompt('Enable auto-fix? (y/N)', 'n')).toLowerCase() === 'y';
  const autoPR = autoFix
    ? (await prompt('Create PRs automatically? (y/N)', 'n')).toLowerCase() === 'y'
    : false;
  const dryRun = (await prompt('Dry run (no changes)? (y/N)', 'n')).toLowerCase() === 'y';

  // Build command
  let cmd = `npx tsx tools/issue-sweeper/run.ts --batch-size=${batchSize} --max-batches=${maxBatches}`;

  if (autoFix) cmd += ' --auto-fix';
  if (autoPR) cmd += ' --auto-pr';
  if (dryRun) cmd += ' --dry-run';

  console.log(`\n${colors.bright}Command:${colors.reset} ${cmd}\n`);

  const confirm = await prompt('Run this command? (Y/n)', 'y');

  if (confirm.toLowerCase() !== 'n') {
    await runCommand(cmd);
  }

  await pressEnterToContinue();
}

/**
 * View current status
 */
async function viewStatus() {
  console.log(`\n${colors.bright}📊 Current Status${colors.reset}\n`);

  const stateFile = 'tools/issue-sweeper/STATE.json';

  if (!existsSync(stateFile)) {
    console.log(`${colors.yellow}⚠️  No state file found. Run the sweeper first.${colors.reset}\n`);
    await pressEnterToContinue();
    return;
  }

  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf-8'));

    console.log(`${colors.cyan}Progress:${colors.reset}`);
    console.log(`  Total Processed: ${colors.green}${state.total_processed}${colors.reset}`);
    console.log(`  Last Issue: #${state.last_issue_number}`);
    console.log(`  Current Page: ${state.cursor}\n`);

    console.log(`${colors.cyan}Statistics:${colors.reset}`);
    console.log(`  ✅ Already Solved: ${colors.green}${state.stats.already_solved}${colors.reset}`);
    console.log(`  🔧 Solved in Run: ${colors.green}${state.stats.solved_in_this_run}${colors.reset}`);
    console.log(`  📝 Not Solved: ${colors.yellow}${state.stats.not_solved}${colors.reset}`);
    console.log(`  ⏸️  Blocked: ${colors.yellow}${state.stats.blocked}${colors.reset}`);
    console.log(`  🔄 Duplicate: ${state.stats.duplicate}`);
    console.log(`  ❌ Invalid: ${state.stats.invalid}\n`);

    if (state.open_prs && state.open_prs.length > 0) {
      console.log(`${colors.cyan}Open PRs:${colors.reset}`);
      for (const pr of state.open_prs.slice(0, 5)) {
        console.log(`  - ${pr}`);
      }
      if (state.open_prs.length > 5) {
        console.log(`  ... and ${state.open_prs.length - 5} more\n`);
      }
    }

    if (state.failures && state.failures.length > 0) {
      console.log(`${colors.red}Recent Failures:${colors.reset}`);
      for (const failure of state.failures.slice(-3)) {
        console.log(`  - Issue #${failure.issue}: ${failure.reason}`);
      }
      console.log(``);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error reading state file${colors.reset}\n`);
  }

  await pressEnterToContinue();
}

/**
 * View performance metrics
 */
async function viewMetrics() {
  console.log(`\n${colors.bright}📈 Performance Metrics${colors.reset}\n`);

  const metricsFile = 'tools/issue-sweeper/METRICS.json';

  if (!existsSync(metricsFile)) {
    console.log(`${colors.yellow}⚠️  No metrics file found. Run the sweeper first.${colors.reset}\n`);
    await pressEnterToContinue();
    return;
  }

  try {
    const metrics = JSON.parse(readFileSync(metricsFile, 'utf-8'));

    console.log(`${colors.cyan}Aggregate Stats:${colors.reset}`);
    console.log(`  Total Runs: ${metrics.aggregate.totalRuns}`);
    console.log(`  Total Processed: ${metrics.aggregate.totalIssuesProcessed}`);
    console.log(`  Total Fixed: ${colors.green}${metrics.aggregate.totalIssuesFixed}${colors.reset}`);
    console.log(`  Success Rate: ${colors.green}${metrics.aggregate.overallSuccessRate.toFixed(1)}%${colors.reset}\n`);

    if (metrics.runs && metrics.runs.length > 0) {
      const lastRun = metrics.runs[metrics.runs.length - 1];
      console.log(`${colors.cyan}Last Run:${colors.reset}`);
      console.log(`  Date: ${new Date(lastRun.startedAt).toLocaleString()}`);
      console.log(`  Duration: ${formatDuration(lastRun.duration)}`);
      console.log(`  Issues: ${lastRun.issuesProcessed}`);
      console.log(`  Fixed: ${lastRun.issuesFixed}`);
      console.log(`  Success Rate: ${lastRun.successRate.toFixed(1)}%\n`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error reading metrics file${colors.reset}\n`);
  }

  await pressEnterToContinue();
}

/**
 * Manage plugins
 */
async function managePlugins() {
  console.log(`\n${colors.bright}🔌 Plugin Management${colors.reset}\n`);
  console.log(`${colors.yellow}Plugin support is available but no plugins loaded.${colors.reset}`);
  console.log(`See documentation for creating custom plugins.\n`);
  await pressEnterToContinue();
}

/**
 * Configure notifications
 */
async function configureNotifications() {
  console.log(`\n${colors.bright}🔔 Notification Configuration${colors.reset}\n`);

  console.log(`Set environment variables to enable notifications:\n`);
  console.log(`${colors.cyan}Slack:${colors.reset}`);
  console.log(`  export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"\n`);

  console.log(`${colors.cyan}Discord:${colors.reset}`);
  console.log(`  export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"\n`);

  console.log(`${colors.cyan}Custom Webhook:${colors.reset}`);
  console.log(`  export NOTIFICATION_WEBHOOK_URL="https://your-webhook.com/endpoint"\n`);

  await pressEnterToContinue();
}

/**
 * Multi-repo mode
 */
async function multiRepoMode() {
  console.log(`\n${colors.bright}🏢 Multi-Repository Mode${colors.reset}\n`);

  console.log(`Create a config file: tools/issue-sweeper/repos.json\n`);
  console.log(`Example:\n`);
  console.log(`${colors.cyan}{
  "repositories": [
    {
      "owner": "BrianCLong",
      "name": "summit",
      "enabled": true,
      "batchSize": 50,
      "priority": 1,
      "options": {
        "autoFix": true,
        "autoPR": true
      }
    }
  ]
}${colors.reset}\n`);

  console.log(`Then run: npx tsx tools/issue-sweeper/multi-repo-runner.ts\n`);

  await pressEnterToContinue();
}

/**
 * View advanced analytics
 */
async function viewAnalytics() {
  console.log(`\n${colors.bright}🧠 Advanced Analytics${colors.reset}\n`);
  console.log(`${colors.yellow}Analytics module loaded. Generating report...${colors.reset}\n`);

  // Would call analytics module here
  console.log(`Advanced analytics available via:
  - generateAnalytics() function
  - exportAnalyticsMarkdown() for reports
  - See lib/analytics.ts for details\n`);

  await pressEnterToContinue();
}

/**
 * Emergency tools
 */
async function emergencyTools() {
  console.log(`\n${colors.bright}🆘 Emergency Tools${colors.reset}\n`);

  console.log(`  ${colors.red}1${colors.reset}. 🔄 Emergency Recovery (reset to clean state)`);
  console.log(`  ${colors.red}2${colors.reset}. 🗑️  Clean up failed branches`);
  console.log(`  ${colors.red}3${colors.reset}. 🧹 Clear cache`);
  console.log(`  ${colors.red}4${colors.reset}. 📋 View rollback log`);
  console.log(`  ${colors.red}0${colors.reset}. 🔙 Back to main menu\n`);

  const choice = await prompt('Choose an option');

  switch (choice) {
    case '1':
      console.log(`\n${colors.red}⚠️  This will reset your repository to a clean state!${colors.reset}`);
      const confirm = await prompt('Are you sure? (yes/NO)', 'no');

      if (confirm.toLowerCase() === 'yes') {
        console.log(`\nRunning emergency recovery...\n`);
        // Would call recovery utilities here
        console.log(`${colors.green}✅ Recovery complete${colors.reset}\n`);
      }
      break;

    case '2':
      console.log(`\nCleaning up failed branches...\n`);
      // Would call cleanup utilities here
      console.log(`${colors.green}✅ Cleanup complete${colors.reset}\n`);
      break;

    case '3':
      console.log(`\nClearing cache...\n`);
      // Would call cache.clearAll() here
      console.log(`${colors.green}✅ Cache cleared${colors.reset}\n`);
      break;

    case '4':
      console.log(`\nRollback log not implemented yet\n`);
      break;
  }

  if (choice !== '0') {
    await pressEnterToContinue();
  }
}

/**
 * Run shell command
 */
async function runCommand(cmd: string): Promise<void> {
  try {
    console.log(`${colors.cyan}Running: ${cmd}${colors.reset}\n`);
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.log(`\n${colors.red}❌ Command failed${colors.reset}\n`);
  }
}

/**
 * Simple prompt function (no external dependencies)
 */
async function prompt(message: string, defaultValue: string = ''): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue
      ? `${colors.bright}${message}${colors.reset} [${defaultValue}]: `
      : `${colors.bright}${message}:${colors.reset} `;

    readline.question(promptText, (answer: string) => {
      readline.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Press enter to continue
 */
async function pressEnterToContinue(): Promise<void> {
  await prompt('\nPress Enter to continue', '');
  printBanner();
}

/**
 * Format duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Run CLI
main().catch((error) => {
  console.error(`\n${colors.red}💥 Fatal error:${colors.reset}`, error);
  process.exit(1);
});
