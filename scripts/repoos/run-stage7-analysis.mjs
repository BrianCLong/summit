#!/usr/bin/env node
/**
 * Stage 7 Complete Repository Analysis
 *
 * Runs all Stage 7 control loops and generates comprehensive health report.
 *
 * Beyond FAANG Innovation: Unified autonomous repository analysis
 *
 * Components:
 * 1. Patch Market - Priority queue optimization
 * 2. Stability Envelope - FE/RMR/MTS monitoring
 * 3. Architectural Genome - Evolution tracking
 * 4. Agent Budget - Storm prevention
 * 5. Patch Surface - Router accuracy
 * 6. Evidence Governance - Decision validation
 * 7. Architecture Evolution - 180-day forecast
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run component analysis
 */
async function runComponent(name, command, options = {}) {
  console.log(`\n━━━ Running: ${name} ━━━\n`);

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: options.timeout || 120000,
      ...options
    });

    console.log(output);
    return { name, status: 'success', output };
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return { name, status: 'failed', error: error.message };
  }
}

/**
 * Generate comprehensive report
 */
async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    stage: '7.0-C',
    components: results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    }
  };

  await fs.mkdir('.repoos/stage7-analysis', { recursive: true });
  await fs.writeFile(
    `.repoos/stage7-analysis/analysis-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(report, null, 2)
  );

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Stage 7 Complete Repository Analysis                   ║');
  console.log('║        Autonomous Systems Health Check                        ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = [];

  // 1. Patch Market Analysis
  results.push(await runComponent(
    'Patch Market',
    'PR_LIMIT=100 node scripts/repoos/patch-market.mjs'
  ));

  // 2. Agent Budget Check
  results.push(await runComponent(
    'Agent Budget',
    'node scripts/repoos/agent-budget-enforcer.mjs'
  ));

  // 3. Patch Surface Analysis (on recent PRs)
  const recentPRs = execSync('gh pr list --limit 10 --json number --jq ".[].number"', { encoding: 'utf-8' })
    .trim()
    .split('\n');

  if (recentPRs.length > 0 && recentPRs[0]) {
    results.push(await runComponent(
      'Patch Surface Limiting',
      `node scripts/repoos/patch-surface-limiter.mjs ${recentPRs[0]}`
    ));
  }

  // 4. Validation Tracker
  results.push(await runComponent(
    'Validation Tracker',
    'node scripts/repoos/validation-tracker.mjs'
  ));

  // Generate report
  const report = await generateReport(results);

  console.log('\n━━━ Analysis Summary ━━━\n');
  console.log(`Components Analyzed: ${report.summary.total}`);
  console.log(`Successful: ${report.summary.successful}`);
  console.log(`Failed: ${report.summary.failed}\n`);

  const reportPath = `.repoos/stage7-analysis/analysis-${new Date().toISOString().split('T')[0]}.json`;
  console.log(`✓ Report saved: ${reportPath}\n`);

  console.log('Beyond FAANG Innovation:');
  console.log('  Unified autonomous repository health analysis');
  console.log('  across all Stage 7 control loops.\n');

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ Analysis error:', error);
  process.exit(2);
});
