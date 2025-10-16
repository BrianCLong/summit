#!/usr/bin/env node

/**
 * CLI tool for PR Risk Analysis
 * Usage:
 *   node scripts/risk-analysis.js current
 *   node scripts/risk-analysis.js range <from-commit> [to-commit]
 *   node scripts/risk-analysis.js report [author] [days]
 */

const { runRiskAnalysis } = require('../src/risk/index.ts');

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    console.error('Usage: node scripts/risk-analysis.js <command> [args...]');
    console.error('');
    console.error('Commands:');
    console.error('  current                    - Analyze current branch');
    console.error('  range <from> [to]          - Analyze commit range');
    console.error('  report [author] [days]     - Generate risk report');
    process.exit(1);
  }

  try {
    await runRiskAnalysis(command, ...args);
  } catch (error) {
    console.error('❌ Risk analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
